// app/verify/VerifyForm.tsx
// ---------------------------------------------------------------------------
// Guest registration — the kiosk route every arrival passes through.
//
// WHAT THIS FORM IS FOR
//
//   It is the property's registration record: who is staying, how to reach
//   them, which document they presented, which nights they occupy, and that
//   they accepted the house rules. It replaces the paper card at the gate.
//
// THE RULES OF THIS PAGE
//
//   1. Identification is mandatory, but it is a *document*, not a selfie. The
//      guest picks the type (Ghana Card, passport, driver's licence) and
//      uploads a picture of it. This works on any phone without a camera
//      permission prompt, which the old live-capture flow did not.
//   2. The selfie is optional. The camera is only opened when the guest asks
//      for it — never on load — so nobody is filmed while reading the form,
//      and a guest with a blocked camera is inconvenienced by nothing.
//   3. No navigation. This route renders no navbar, no footer and no back
//      link, so a guest cannot wander into the marketing site mid-check-in.
//      locked when it does. A guest who arrived without one types it, and can
//      correct a wrong prefill. The value is read on the server (page.tsx) and
//      passed in, so the first paint already shows it — no flash of an empty
//      field, and no hydration mismatch from reading the URL in an effect.
//   5. The text saves itself while the guest types (debounced upsert keyed on a
//      per-visit session id), so a dropped connection or a closed tab loses
//      nothing. Submit finalises the row and returns them to the site.
//
// STORAGE
//
//   Table: public.guest_verifications (see
//   supabase/migrations/2026-11-13-verification-form-fields.sql).
//   Files: private bucket `verifications`, path `<session_id>/<kind>-<ts>.<ext>`.
//   `id_photo_path` and `photo_path` are separate columns on purpose — an ID
//   document and a selfie are different evidence and must not be confused when
//   staff review a record.
// ---------------------------------------------------------------------------

"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  AlertCircle,
  ArrowLeft,
  ArrowRight,
  Check,
  ChevronDown,
  Loader2,
  ShieldCheck,
} from "lucide-react";
import { createClient, isSupabaseConfigured } from "../utils/supabase";
import {
  CheckRow,
  Field,
  IdUpload,
  Section,
  SelectField,
  SelfieCard,
  VerifyStyles,
  type CameraState,
} from "./ui";

const TABLE = "guest_verifications";
const BUCKET = "verifications";
const RULES_TABLE = "house_rules";
const AUTOSAVE_DELAY_MS = 1500;
/** Phone cameras produce large files; 8 MB accepts a full-resolution photo. */
const MAX_UPLOAD_BYTES = 8 * 1024 * 1024;
const MAX_GUESTS = 40;
/**
 * The wizard, one section per page. Numbering matches the confirmation email a
 * guest was sent, so "section three" means the same thing to them and to staff.
 */
const STEPS = [
  { n: 1, title: "Personal information" },
  { n: 2, title: "Contact information" },
  { n: 3, title: "Identification" },
  { n: 4, title: "Booking details" },
  { n: 5, title: "Emergency contact" },
  { n: 6, title: "Guest declaration" },
] as const;

const STEP_NUMBERS = [1, 2, 3, 4, 5, 6];
const LAST_STEP = 6;

/**
 * The draft the guest is working on, kept on their own device.
 *
 * Two reasons this exists rather than relying on the database row:
 *
 *   1. A reload, a dead battery or a phone that locks mid-form should not cost
 *      the guest their typing. localStorage survives all three; a React state
 *      tree does not.
 *   2. The row in Supabase is only as reliable as the network. The draft is not.
 *
 * It is deliberately mirrored, not merged: the database is still the record of
 * truth for staff, and this is only ever read back by the same browser. It is
 * cleared when the guest submits — never before, and never on a step change.
 */
const DRAFT_KEY = "cc.verify.draft.v1";
const DRAFT_MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000;
const DRAFT_DEBOUNCE_MS = 400;

type Draft = {
  version: 1;
  sessionId: string;
  form: GuestForm;
  step: number;
  declaredAccurate: boolean;
  acceptedRules: boolean;
  idPath: string | null;
  selfiePath: string | null;
  savedAt: number;
};

function readDraft(): Draft | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(DRAFT_KEY);
    if (!raw) return null;
    const draft = JSON.parse(raw) as Draft;
    if (draft?.version !== 1 || !draft.form) return null;
    if (Date.now() - (draft.savedAt ?? 0) > DRAFT_MAX_AGE_MS) {
      window.localStorage.removeItem(DRAFT_KEY);
      return null;
    }
    return draft;
  } catch {
    // Private mode, a full quota, or a half-written value: none of these are
    // worth breaking the form over.
    return null;
  }
}

function writeDraft(draft: Draft): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(DRAFT_KEY, JSON.stringify(draft));
  } catch {
    // Ignore. The database save is still attempted independently.
  }
}

function clearDraft(): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(DRAFT_KEY);
  } catch {
    // Ignore.
  }
}

type SaveState = "idle" | "saving" | "saved" | "error";
type IdType = "" | "ghana_card" | "passport" | "drivers_licence";

/** The three documents accepted at the gate. */
const ID_TYPES: { value: Exclude<IdType, "">; label: string; hint: string }[] = [
  { value: "ghana_card", label: "Ghana Card", hint: "The national ID card" },
  { value: "passport", label: "Passport", hint: "Any country" },
  { value: "drivers_licence", label: "Driver's Licence", hint: "Photo card licence" },
];

interface GuestForm {
  /** The reservation this registration belongs to. Required — it is how the
   *  record is reconciled with the booking. */
  fullName: string;
  phone: string;
  whatsapp: string;
  email: string;
  idType: IdType;
  checkIn: string;
  checkOut: string;
  /** Held as a string so the field can be empty instead of showing 0. */
  guests: string;
  emergencyName: string;
  emergencyRelationship: string;
  emergencyPhone: string;
}

interface HouseRule {
  id: string;
  title: string;
  body: string | null;
}

const EMPTY_FORM: GuestForm = {
  fullName: "",
  phone: "",
  whatsapp: "",
  email: "",
  idType: "",
  checkIn: "",
  checkOut: "",
  guests: "",
  emergencyName: "",
  emergencyRelationship: "",
  emergencyPhone: "",
};

/** Digits only, so `+233 24 000 0000` and `0240000000` both count as filled. */
function digitsOnly(value: string): string {
  return value.replace(/\D+/g, "");
}

function isPlausiblePhone(value: string): boolean {
  const digits = digitsOnly(value);
  return digits.length >= 7 && digits.length <= 15;
}

function isPlausibleEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(value.trim());
}

/** Extension for a storage path, derived from the MIME type the browser gave us. */
function extensionFor(file: File): string {
  const byType: Record<string, string> = {
    "image/jpeg": "jpg",
    "image/png": "png",
    "image/webp": "webp",
    "image/heic": "heic",
    "image/heif": "heif",
  };
  if (byType[file.type]) return byType[file.type];
  const fromName = file.name.split(".").pop()?.toLowerCase() ?? "";
  return /^[a-z0-9]{2,5}$/.test(fromName) ? fromName : "jpg";
}

export default function VerifyForm() {
  const configured = isSupabaseConfigured();
  const router = useRouter();

  /**
   * One id per visit. The row is keyed on it, so the debounced auto-save
   * updates the same record instead of creating a guest on every pause.
   *
   * Restored from the local draft when there is one, so a reload continues the
   * same row instead of leaving an abandoned draft behind and starting another.
   */
  const [sessionId, setSessionId] = useState(() =>
    typeof crypto !== "undefined" && "randomUUID" in crypto
      ? crypto.randomUUID()
      : `v-${Date.now()}-${Math.random().toString(16).slice(2)}`,
  );

  const [form, setForm] = useState<GuestForm>(() => ({
    ...EMPTY_FORM,
  }));
  const [saveState, setSaveState] = useState<SaveState>("idle");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);

  /** Which page of the wizard is showing. 1-based, matching STEPS. */
  const [step, setStep] = useState(1);

  /** When a draft was restored, so the page can say so and offer a reset. */
  const [restoredAt, setRestoredAt] = useState<number | null>(null);


  /* ---------------- identification ---------------- */

  const [idFile, setIdFile] = useState<File | null>(null);
  const [idPreview, setIdPreview] = useState<string | null>(null);
  const [idPath, setIdPath] = useState<string | null>(null);
  const [idUploading, setIdUploading] = useState(false);
  const idInputRef = useRef<HTMLInputElement | null>(null);

  /* ---------------- optional selfie ---------------- */

  const [cameraState, setCameraState] = useState<CameraState>("idle");
  /** Why the camera did not start, phrased for the guest rather than the log. */
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [photoConsent, setPhotoConsent] = useState(false);
  const [selfie, setSelfie] = useState<string | null>(null);
  const [selfiePath, setSelfiePath] = useState<string | null>(null);
  const [selfieUploading, setSelfieUploading] = useState(false);

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const cameraReady = cameraState === "ready";

  /* ---------------- declaration ---------------- */

  const [declaredAccurate, setDeclaredAccurate] = useState(false);
  const [acceptedRules, setAcceptedRules] = useState(false);

  const [rules, setRules] = useState<HouseRule[]>([]);
  const errorRef = useRef<HTMLParagraphElement | null>(null);

  const set = useCallback(
    <K extends keyof GuestForm,>(key: K, value: GuestForm[K]) =>
      setForm((prev) => ({ ...prev, [key]: value })),
    [],
  );

  /* ---------------- house rules ---------------- */

  useEffect(() => {
    if (!configured) return;
    let cancelled = false;

    (async () => {
      const { data } = await createClient()
        .from(RULES_TABLE)
        .select("id, title, body")
        .eq("active", true)
        .order("sort_order", { ascending: true });

      if (!cancelled && Array.isArray(data)) setRules(data as HouseRule[]);
    })();

    return () => {
      cancelled = true;
    };
  }, [configured]);

  /* ---------------- camera (opt-in) ---------------- */

  const stopCamera = useCallback(() => {
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
  }, []);

  const startCamera = useCallback(async () => {
    // Outside a secure context `navigator.mediaDevices` is not even defined, so
    // "no camera" would be the wrong thing to tell the guest.
    if (typeof window !== "undefined" && !window.isSecureContext) {
      setCameraState("unsupported");
      setCameraError(
        "The camera needs a secure (https) connection. You can skip this step — your ID picture is enough.",
      );
      return;
    }
    if (typeof navigator === "undefined" || !navigator.mediaDevices?.getUserMedia) {
      setCameraState("unsupported");
      setCameraError(
        "This browser cannot open a camera. You can skip this step — your ID picture is enough.",
      );
      return;
    }

    setCameraState("starting");
    setCameraError(null);

    // Cameras disagree about constraints: some reject a facingMode they do not
    // have, some reject any constraint at all. Try progressively looser ones
    // rather than calling a perfectly good camera broken.
    const attempts: MediaStreamConstraints[] = [
      { video: { facingMode: "user", width: { ideal: 720 } }, audio: false },
      { video: { width: { ideal: 720 } }, audio: false },
      { video: true, audio: false },
    ];

    let lastError: unknown = null;
    for (const constraints of attempts) {
      try {
        const stream = await navigator.mediaDevices.getUserMedia(constraints);
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play().catch(() => {});
        }
        setCameraState("ready");
        setCameraError(null);
        return;
      } catch (error) {
        lastError = error;
        const name = cameraErrorName(error);
        // A refusal or a missing device will not change by asking again.
        if (name === "NotAllowedError" || name === "SecurityError" || name === "NotFoundError") break;
      }
    }

    setCameraState("denied");
    setCameraError(describeCameraFailure(lastError));
  }, []);

  useEffect(() => () => stopCamera(), [stopCamera]);

  /**
   * Attach the stream once the <video> is actually on the page.
   *
   * The element is only rendered while the card is in its ready state, so
   * assigning `srcObject` inside startCamera ran while there was still nothing
   * to assign it to: permission granted, frames flowing, and a black rectangle
   * on screen — which reads as "the camera doesn't work". Re-attaching after
   * every state change is harmless and also covers "Try again".
   */
  useEffect(() => {
    if (cameraState !== "ready") return;
    const video = videoRef.current;
    const stream = streamRef.current;
    if (!video || !stream) return;
    if (video.srcObject !== stream) video.srcObject = stream;
    void video.play().catch(() => {});
  }, [cameraState]);

  /* ---------------- draft on this device ---------------- */

  /**
   * Restore after mount, never during render.
   *
   * Reading localStorage in a useState initialiser would make the server's HTML
   * (empty fields) disagree with the browser's first render (filled fields) and
   * trigger a hydration mismatch, so the read has to happen once the page is
   * live. That is exactly the case this rule is meant to catch, and exactly the
   * case it must allow.
   */
  useEffect(() => {
    const draft = readDraft();
    if (!draft) return;

    /* eslint-disable react-hooks/set-state-in-effect --
       A one-time read from this device's storage. The rule assumes state can be
       derived during render, which is not true here: the server has no
       localStorage, so restoring during render would emit markup that disagrees
       with the browser's first paint and trip hydration. This effect is the
       documented place for a sync from an external system. */
    setSessionId(draft.sessionId);
    setForm({ ...EMPTY_FORM, ...draft.form });
    setDeclaredAccurate(Boolean(draft.declaredAccurate));
    setAcceptedRules(Boolean(draft.acceptedRules));
    setIdPath(draft.idPath);
    setSelfiePath(draft.selfiePath);
    setStep(Math.min(LAST_STEP, Math.max(1, draft.step || 1)));
    setRestoredAt(draft.savedAt);
    /* eslint-enable react-hooks/set-state-in-effect */
  }, []);

  /* ---------------- storage ---------------- */

  const uploadFile = useCallback(
    async (file: Blob, kind: "id" | "selfie", extension: string): Promise<string | null> => {
      const path = `${sessionId}/${kind}-${Date.now()}.${extension}`;
      const { error: uploadError } = await createClient()
        .storage.from(BUCKET)
        .upload(path, file, {
          contentType: file.type || "image/jpeg",
          upsert: true,
          cacheControl: "3600",
        });

      if (uploadError) {
        setError(`The picture could not be uploaded: ${uploadError.message}`);
        return null;
      }
      return path;
    },
    [sessionId],
  );

  const acceptIdFile = useCallback(
    async (file: File | null) => {
      if (!file) return;
      setError("");

      if (!file.type.startsWith("image/")) {
        setError("Please choose a picture of your ID (JPG, PNG or HEIC).");
        return;
      }
      if (file.size > MAX_UPLOAD_BYTES) {
        setError("That picture is larger than 8 MB. Please choose a smaller one.");
        return;
      }

      if (idPreview?.startsWith("blob:")) URL.revokeObjectURL(idPreview);
      setIdFile(file);
      setIdPreview(URL.createObjectURL(file));
      setIdUploading(true);
      const path = await uploadFile(file, "id", extensionFor(file));
      if (path) setIdPath(path);
      setIdUploading(false);
    },
    [idPreview, uploadFile],
  );

  const clearIdFile = useCallback(() => {
    if (idPreview?.startsWith("blob:")) URL.revokeObjectURL(idPreview);
    setIdFile(null);
    setIdPreview(null);
    setIdPath(null);
    if (idInputRef.current) idInputRef.current.value = "";
  }, [idPreview]);

  const captureFrame = useCallback((): Promise<Blob | null> => {
    const video = videoRef.current;
    if (!video || !video.videoWidth) return Promise.resolve(null);

    const canvas = document.createElement("canvas");
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const context = canvas.getContext("2d");
    if (!context) return Promise.resolve(null);
    context.drawImage(video, 0, 0, canvas.width, canvas.height);

    return new Promise((resolve) => canvas.toBlob((blob) => resolve(blob), "image/jpeg", 0.85));
  }, []);

  const takeSelfie = useCallback(async () => {
    if (!cameraReady) return;
    if (!photoConsent) {
      setError("Tick the consent box first — the picture is only taken with your agreement.");
      return;
    }
    setError("");
    const blob = await captureFrame();
    if (!blob) {
      setError("The camera is not ready yet. Give it a second and try again.");
      return;
    }
    if (selfie?.startsWith("blob:")) URL.revokeObjectURL(selfie);
    setSelfie(URL.createObjectURL(blob));
    setSelfieUploading(true);
    const path = await uploadFile(blob, "selfie", "jpg");
    if (path) setSelfiePath(path);
    setSelfieUploading(false);
  }, [cameraReady, captureFrame, photoConsent, selfie, uploadFile]);

  const removeSelfie = useCallback(() => {
    if (selfie?.startsWith("blob:")) URL.revokeObjectURL(selfie);
    setSelfie(null);
    setSelfiePath(null);
    setPhotoConsent(false);
    stopCamera();
    setCameraState("idle");
  }, [selfie, stopCamera]);

  /* ---------------- saving ---------------- */

  const persist = useCallback(
    async (
      record: GuestForm,
      paths: { id: string | null; selfie: string | null },
      flags: { accurate: boolean; rules: boolean },
      finalise: boolean,
    ) => {
      if (!configured) return;
      setSaveState("saving");

      const guests = Number.parseInt(record.guests, 10);
      const { error: writeError } = await createClient()
        .from(TABLE)
        .upsert(
          {
            session_id: sessionId,
            full_name: record.fullName.trim() || null,
            contact_number: record.phone.trim() || null,
            whatsapp_number: record.whatsapp.trim() || null,
            email: record.email.trim() || null,
            id_type: record.idType || null,
            id_photo_path: paths.id,
            photo_path: paths.selfie,
            check_in_date: record.checkIn || null,
            check_out_date: record.checkOut || null,
            guests_count: Number.isFinite(guests) ? guests : null,
            emergency_name: record.emergencyName.trim() || null,
            emergency_relationship: record.emergencyRelationship.trim() || null,
            emergency_phone: record.emergencyPhone.trim() || null,
            declared_accurate: flags.accurate,
            accepted_rules: flags.rules,
            status: finalise ? "submitted" : "draft",
            ...(finalise ? { submitted_at: new Date().toISOString() } : {}),
            updated_at: new Date().toISOString(),
          },
          { onConflict: "session_id" },
        );

      if (writeError) {
        setError(describeSaveError(writeError.message));
        setSaveState("error");
        return;
      }
      setError("");
      setSaveState("saved");
    },
    [configured, sessionId],
  );

  /** Something worth saving exists once any identifying field has content. */
  const hasProgress =
    Boolean(form.fullName.trim()) ||
    Boolean(form.phone.trim()) ||
    Boolean(idPath);

  // The local draft, written on a shorter fuse than the database: it is cheap,
  // synchronous and must not be lost to a refresh.
  useEffect(() => {
    if (done || !hasProgress) return;

    const timer = setTimeout(() => {
      writeDraft({
        version: 1,
        sessionId,
        form,
        step,
        declaredAccurate,
        acceptedRules,
        idPath,
        selfiePath,
        savedAt: Date.now(),
      });
    }, DRAFT_DEBOUNCE_MS);

    return () => clearTimeout(timer);
  }, [form, step, declaredAccurate, acceptedRules, idPath, selfiePath, sessionId, done, hasProgress]);

  useEffect(() => {
    if (done || !hasProgress) return;

    const timer = setTimeout(
      () =>
        void persist(
          form,
          { id: idPath, selfie: selfiePath },
          { accurate: declaredAccurate, rules: acceptedRules },
          false,
        ),
      AUTOSAVE_DELAY_MS,
    );
    return () => clearTimeout(timer);
  }, [form, idPath, selfiePath, declaredAccurate, acceptedRules, hasProgress, persist, done]);

  /* ---------------- validation ---------------- */

  /**
   * Outstanding issues, keyed by the step that owns them.
   *
   * One object rather than a chain of ifs: Continue, the error banner and the
   * final submit all read from here, so they can never disagree — and a guest
   * who reaches the last page with an earlier page still incomplete is sent
   * back to the page that owns the problem instead of being told about a field
   * that is no longer on screen.
   */
  const stepIssues = useMemo((): Record<number, string> => {
    const issues: Record<number, string> = {};

    if (!form.fullName.trim()) issues[1] = "Enter your full name as it appears on your ID.";

    if (!isPlausiblePhone(form.phone)) issues[2] = "Enter a phone number we can reach you on.";
    else if (!isPlausiblePhone(form.whatsapp)) issues[2] = "Enter your WhatsApp number.";
    else if (form.email.trim() && !isPlausibleEmail(form.email))
      issues[2] = "Enter a valid email address, or leave the field blank.";

    if (!form.idType) issues[3] = "Choose the type of ID you are presenting.";
    else if (!idPath && !idFile) issues[3] = "Upload a clear picture of your ID.";

    const guests = Number.parseInt(form.guests, 10);
    if (!form.checkIn) issues[4] = "Choose your check-in date.";
    else if (!form.checkOut) issues[4] = "Choose your check-out date.";
    else if (form.checkOut < form.checkIn) issues[4] = "Check-out cannot be before check-in.";
    else if (!(guests >= 1)) issues[4] = "Enter how many guests are staying.";
    else if (guests > MAX_GUESTS) issues[4] = `Enter a number of guests up to ${MAX_GUESTS}.`;

    // Section 5 is optional, but half an emergency contact is worse than none:
    // once one field is used, a name and a number are both required.
    const emergencyTouched = Boolean(
      form.emergencyName.trim() || form.emergencyRelationship.trim() || form.emergencyPhone.trim(),
    );
    if (emergencyTouched && !form.emergencyName.trim())
      issues[5] = "Enter the name of your emergency contact.";
    else if (emergencyTouched && !isPlausiblePhone(form.emergencyPhone))
      issues[5] = "Enter a usable phone number for your emergency contact.";

    if (!declaredAccurate) issues[6] = "Confirm that the information you gave is accurate.";
    else if (!acceptedRules) issues[6] = "Agree to the house rules to continue.";

    return issues;
  }, [form, idPath, idFile, declaredAccurate, acceptedRules]);

  /** The earliest page with an outstanding issue; 0 when all six are clear. */
  const firstBadStep = STEP_NUMBERS.find((n) => stepIssues[n]) ?? 0;
  const currentIssue = stepIssues[step] ?? null;
  const problem = firstBadStep ? stepIssues[firstBadStep] : null;
  const canSubmit = !problem && !submitting;
  const isLast = step === LAST_STEP;

  /* ---------------- stepping ---------------- */

  const headingRef = useRef<HTMLHeadingElement | null>(null);
  const firstPaint = useRef(true);

  useEffect(() => {
    // Not on the first paint — the guest has not moved yet, so there is nothing
    // to announce and no reason to jump the page.
    if (firstPaint.current) {
      firstPaint.current = false;
      return;
    }
    // A new page, so start at the top of it — and move focus to the heading so
    // a screen reader announces where the guest has landed. preventScroll
    // because the smooth scroll above is already doing that job.
    window.scrollTo({ top: 0, behavior: "smooth" });
    headingRef.current?.focus({ preventScroll: true });
  }, [step]);

  /** Advance, or explain what is missing on this page. */
  function goNext() {
    if (currentIssue) {
      setError(currentIssue);
      return;
    }
    setError("");
    setStep((value) => Math.min(LAST_STEP, value + 1));
  }

  function goBack() {
    setError("");
    setStep((value) => Math.max(1, value - 1));
  }

  /** A shared kiosk must not hand the next guest the previous one's details. */
  function startOver() {
    clearDraft();
    setForm(EMPTY_FORM);
    setDeclaredAccurate(false);
    setAcceptedRules(false);
    setIdPath(null);
    setSelfiePath(null);
    setIdPreview(null);
    setSelfie(null);
    setPhotoConsent(false);
    setRestoredAt(null);
    setStep(1);
    setError("");
  }

  function jumpTo(target: number) {
    setError("");
    setStep(target);
  }

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError("");

    if (problem) {
      setStep(firstBadStep);
      setError(problem);
      return;
    }

    setSubmitting(true);

    // The file uploads on selection, but a guest may submit while it is still
    // in flight. Retry here so a slow connection cannot produce an empty path.
    let finalIdPath = idPath;
    if (!finalIdPath && idFile) {
      finalIdPath = await uploadFile(idFile, "id", extensionFor(idFile));
      if (finalIdPath) setIdPath(finalIdPath);
    }

    await persist(
      form,
      { id: finalIdPath, selfie: selfiePath },
      { accurate: declaredAccurate, rules: acceptedRules },
      true,
    );

    setSubmitting(false);
    setDone(true);

    // Tell the office. Fire-and-forget on purpose: the guest's registration is
    // already saved, and a mail outage must not turn that into an error screen.
    // The endpoint re-reads the row by session id, so nothing here is trusted.
    void fetch("/api/verify/notify", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ sessionId }),
    }).catch(() => {});
    // The one and only place the draft is discarded.
    clearDraft();
    // Kiosk hand-off: the guest is returned to the site, not left on a dead end.
    setTimeout(() => router.replace("/"), 1400);
  }

  /* ---------------- views ---------------- */

  if (done) {
    return (
      <main
        className="flex min-h-screen items-center justify-center px-5"
        style={{ background: "var(--color-canvas-warm)" }}
      >
        <div
          className="w-full max-w-sm rounded-2xl border bg-white p-9 text-center shadow-[0_12px_40px_rgba(30,36,43,0.08)]"
          style={{ borderColor: "#E8E2D8" }}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/cc-real.png" alt="Cosy Crest" className="mx-auto h-10 w-auto opacity-90" />
          <div
            className="mx-auto mt-6 flex h-12 w-12 items-center justify-center rounded-full"
            style={{ background: "var(--color-accent)" }}
          >
            <Check className="h-6 w-6 text-white" />
          </div>
          <h1
            className="mt-5 font-display text-2xl tracking-tight"
            style={{ color: "var(--color-ink)" }}
          >
            Registered — thank you
          </h1>
          <p className="mt-2.5 text-[13px] leading-relaxed text-[var(--color-muted)]">
            Your details are with us. Taking you back to Cosy Crest…
          </p>
          <p className="mt-6 inline-flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-[#B5AE9F]">
            <Loader2 className="h-3 w-3 animate-spin" /> Redirecting
          </p>
        </div>
      </main>
    );
  }

  const isFirst = step === 1;

  return (
    <main className="min-h-screen" style={{ background: "var(--color-canvas-warm)" }}>
      <VerifyStyles />

      {/* The property, not a form. Full height on the first page, then folded
          down to a strip so the remaining five pages start with the field
          rather than with a photograph they have already seen. */}
      <header
        className={`relative isolate flex items-end overflow-hidden ${
          isFirst ? "min-h-[320px] sm:min-h-[360px]" : "min-h-[104px] sm:min-h-[116px]"
        }`}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/Adenta4.jpg"
          alt=""
          aria-hidden
          className="absolute inset-0 h-full w-full object-cover object-[50%_45%]"
        />

        {/* Two scrims, one per shape of the screen. A phone shows the band as a
            wide, short strip with type across the full width, so it needs a
            vertical wash; a desktop keeps the room visible to the right and
            only darkens the left, where the type sits. */}
        <div
          className="absolute inset-0 md:hidden"
          style={{
            background:
              "linear-gradient(180deg, rgba(18,22,26,0.62) 0%, rgba(18,22,26,0.72) 55%, rgba(18,22,26,0.92) 100%)",
          }}
        />
        <div
          className="absolute inset-0 hidden md:block"
          style={{
            background:
              "linear-gradient(100deg, rgba(18,22,26,0.94) 0%, rgba(18,22,26,0.86) 30%, rgba(18,22,26,0.55) 58%, rgba(18,22,26,0.22) 82%, rgba(18,22,26,0.10) 100%)",
          }}
        />
        <div
          className="absolute inset-x-0 bottom-0 h-px"
          style={{ background: "linear-gradient(90deg, transparent, #C9A227, transparent)" }}
          aria-hidden
        />

        <div className="relative mx-auto w-full max-w-lg px-5 pb-6 pt-5">
          <div className="flex items-center justify-between gap-3">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/cc-horinzontal.png"
              alt="Cosy Crest Apartments"
              className={`w-auto drop-shadow-[0_1px_6px_rgba(0,0,0,0.45)] ${isFirst ? "h-8" : "h-6"}`}
            />
          </div>

          {isFirst ? (
            <>
              <span className="mt-8 inline-flex w-fit items-center gap-1.5 rounded-full border border-white/25 bg-white/10 px-2.5 py-1 text-[9.5px] font-semibold uppercase tracking-[0.14em] text-white/90 backdrop-blur">
                <ShieldCheck className="h-3 w-3" /> Required for access
              </span>
              <h1
                ref={headingRef}
                tabIndex={-1}
                style={{ outline: "none" }}
                className="mt-3 font-display text-[34px] leading-[1.08] tracking-tight text-white drop-shadow-sm"
              >
                Guest registration
              </h1>
              <p className="mt-2 max-w-sm text-[13px] leading-relaxed text-white/80">
                Six short steps, about a minute, and no paperwork at the gate.
              </p>
              <div className="mt-4 flex flex-wrap gap-1.5">
                {["Photo ID", "About a minute", "No paperwork at the gate"].map((chip) => (
                  <span
                    key={chip}
                    className="rounded-full border border-white/20 bg-black/20 px-2.5 py-1 text-[10px] font-medium text-white/85 backdrop-blur-sm"
                  >
                    {chip}
                  </span>
                ))}
              </div>
            </>
          ) : (
            <h1 ref={headingRef} tabIndex={-1} style={{ outline: "none" }} className="sr-only">
              {STEPS[step - 1].title}
            </h1>
          )}
        </div>
      </header>

      <div className="mx-auto max-w-lg px-5 pb-14">
        {/* Step rail. Six segments rather than a percentage: the guest can see
            how many pages are left, and tapping a finished segment goes back to
            it. Pinned, because the page is otherwise taller than a phone. */}
        <div
          className="sticky top-0 z-20 -mx-5 mb-4 px-5 py-3 backdrop-blur"
          style={{ background: "rgba(251,249,246,0.92)", boxShadow: "0 1px 0 #E8E2D8" }}
        >
          <div className="flex items-center gap-3">
            <div className="flex flex-1 gap-1">
              {STEPS.map((item) => (
                <button
                  key={item.n}
                  type="button"
                  onClick={() => item.n < step && jumpTo(item.n)}
                  disabled={item.n >= step}
                  aria-label={`Step ${item.n}: ${item.title}`}
                  aria-current={item.n === step ? "step" : undefined}
                  className="h-[3px] flex-1 rounded-full transition-colors disabled:cursor-default"
                  style={{
                    background:
                      item.n < step
                        ? "var(--color-accent)"
                        : item.n === step
                          ? "#8795A1"
                          : "#E9E2D6",
                  }}
                />
              ))}
            </div>
            <span className="shrink-0 text-[9.5px] font-semibold uppercase tracking-[0.14em] text-[#9A9284]">
              Step {step} of {LAST_STEP}
            </span>
          </div>
        </div>

        {!configured && (
          <div
            className="mb-4 rounded-xl border p-3.5 text-[12px] leading-relaxed"
            style={{ borderColor: "#E8DCC0", background: "#FBF6E9", color: "#7A6520" }}
          >
            This form is not connected to the database yet. Nothing you enter will be saved.
          </div>
        )}

        {restoredAt && (
          <div
            className="mb-4 flex items-center justify-between gap-3 rounded-xl border px-3.5 py-2.5"
            style={{ borderColor: "#E8E2D8", background: "#FDFBF8" }}
          >
            <p className="text-[11.5px] leading-relaxed text-[#7A7264]">
              We kept the details entered earlier on this device.
            </p>
            <button
              type="button"
              onClick={startOver}
              className="shrink-0 text-[11px] font-semibold underline underline-offset-4"
              style={{ color: "var(--color-accent)" }}
            >
              Start over
            </button>
          </div>
        )}

        <form onSubmit={onSubmit} className="space-y-4">
          {/* Keyed on the step so React remounts the page and the entry
              animation replays — the only reason a key is ever needed here. */}
          <div key={step} className="cc-step space-y-4">
            {step === 1 && (
              <Section index={1} title="Personal information" description="Who is staying.">
                <Field
                  label="Full name"
                  required
                  value={form.fullName}
                  onChange={(value) => set("fullName", value)}
                  placeholder="As it appears on your ID"
                  autoComplete="name"
                />
              </Section>
            )}

            {step === 2 && (
              <Section
                index={2}
                title="Contact information"
                description="We use these only to reach you about this stay."
              >
                <Field
                  label="Phone number"
                  required
                  value={form.phone}
                  onChange={(value) => set("phone", value)}
                  placeholder="e.g. 024 000 0000"
                  autoComplete="tel"
                  inputMode="tel"
                />
                <div>
                  <Field
                    label="WhatsApp number"
                    required
                    value={form.whatsapp}
                    onChange={(value) => set("whatsapp", value)}
                    placeholder="Usually the same as your phone number"
                    autoComplete="tel"
                    inputMode="tel"
                  />
                  {isPlausiblePhone(form.phone) && form.whatsapp !== form.phone && (
                    <button
                      type="button"
                      onClick={() => set("whatsapp", form.phone)}
                      className="mt-2 inline-flex items-center gap-1.5 text-[11px] font-medium underline underline-offset-4"
                      style={{ color: "var(--color-accent)" }}
                    >
                      Same as phone number
                    </button>
                  )}
                </div>
                <Field
                  label="Email address"
                  optional
                  type="email"
                  value={form.email}
                  onChange={(value) => set("email", value)}
                  placeholder="you@example.com"
                  autoComplete="email"
                  inputMode="email"
                />
              </Section>
            )}

            {step === 3 && (
              <>
                <Section
                  index={3}
                  title="Identification"
                  description="Choose the document you are presenting, then photograph it. Make sure the whole card is in frame and the text is readable."
                >
                  <SelectField
                    label="Type of ID"
                    required
                    value={form.idType}
                    onChange={(value) => set("idType", value as IdType)}
                    placeholder="Choose a document"
                    options={ID_TYPES.map((type) => ({
                      value: type.value,
                      label: `${type.label} — ${type.hint}`,
                    }))}
                  />

                  <IdUpload
                    inputRef={idInputRef}
                    preview={idPreview}
                    uploading={idUploading}
                    hasStored={Boolean(idPath) && !idPreview}
                    onSelect={(file) => void acceptIdFile(file)}
                    onClear={clearIdFile}
                  />
                </Section>

                <SelfieCard
                  state={cameraState}
                  videoRef={videoRef}
                  preview={selfie}
                  consent={photoConsent}
                  uploading={selfieUploading}
                  error={cameraError}
                  onConsent={setPhotoConsent}
                  onStart={() => void startCamera()}
                  onCapture={() => void takeSelfie()}
                  onRemove={removeSelfie}
                />
              </>
            )}

            {step === 4 && (
              <Section index={4} title="Booking details" description="Which nights, and how many.">
                <div className="grid gap-4 sm:grid-cols-2">
                  <Field
                    label="Check-in date"
                    required
                    type="date"
                    value={form.checkIn}
                    onChange={(value) => set("checkIn", value)}
                  />
                  <Field
                    label="Check-out date"
                    required
                    type="date"
                    value={form.checkOut}
                    onChange={(value) => set("checkOut", value)}
                    min={form.checkIn || undefined}
                  />
                </div>

                <Field
                  label="Number of guests"
                  required
                  type="number"
                  value={form.guests}
                  onChange={(value) => set("guests", value)}
                  placeholder="Including yourself"
                  inputMode="numeric"
                  min={1}
                  max={MAX_GUESTS}
                />
              </Section>
            )}

            {step === 5 && (
              <Section
                index={5}
                title="Emergency contact"
                optional
                description="Someone we may call if we cannot reach you during the stay. Leave all three blank to skip."
              >
                <Field
                  label="Full name"
                  value={form.emergencyName}
                  onChange={(value) => set("emergencyName", value)}
                  placeholder="Their full name"
                  autoComplete="off"
                />
                <Field
                  label="Relationship"
                  value={form.emergencyRelationship}
                  onChange={(value) => set("emergencyRelationship", value)}
                  placeholder="e.g. Sister, colleague, spouse"
                  autoComplete="off"
                />
                <Field
                  label="Phone number"
                  value={form.emergencyPhone}
                  onChange={(value) => set("emergencyPhone", value)}
                  placeholder="e.g. 024 000 0000"
                  inputMode="tel"
                  autoComplete="off"
                />
              </Section>
            )}

            {step === 6 && (
              <>
                {/* Everything they typed, on one page, before they commit. An
                    Edit button returns to the page that owns the value. */}
                <ReviewCard
                  rows={[
                    { label: "Guest", value: form.fullName || "—", step: 1 },
                    {
                      label: "Contact",
                      value: [form.phone, form.email].filter(Boolean).join(" · ") || "—",
                      step: 2,
                    },
                    {
                      label: "ID",
                      value:
                        ID_TYPES.find((type) => type.value === form.idType)?.label ?? "Not chosen",
                      step: 3,
                    },
                    {
                      label: "Stay",
                      value: `${prettyDate(form.checkIn)} → ${prettyDate(form.checkOut)} · ${
                        form.guests || "—"
                      } ${Number.parseInt(form.guests, 10) === 1 ? "guest" : "guests"}`,
                      step: 4,
                    },
                    {
                      label: "Emergency",
                      value: form.emergencyName
                        ? `${form.emergencyName}${
                            form.emergencyRelationship ? ` (${form.emergencyRelationship})` : ""
                          } · ${form.emergencyPhone || "no number"}`
                        : "Not provided",
                      step: 5,
                    },
                  ]}
                  onEdit={jumpTo}
                />

                <details
                  className="group overflow-hidden rounded-2xl border bg-white shadow-[0_1px_2px_rgba(30,36,43,0.05)] [&_summary::-webkit-details-marker]:hidden"
                  style={{ borderColor: "#E8E2D8" }}
                >
                  <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-5 py-4 sm:px-6">
                    <span
                      className="font-display text-[17px] tracking-tight"
                      style={{ color: "var(--color-ink)" }}
                    >
                      House rules &amp; terms
                    </span>
                    <ChevronDown className="h-4 w-4 shrink-0 text-[#B5AE9F] transition-transform duration-200 group-open:rotate-180" />
                  </summary>

                  <div className="border-t px-5 pb-5 pt-4 sm:px-6" style={{ borderColor: "#F2EDE4" }}>
                    {rules.length > 0 ? (
                      <ul className="space-y-3">
                        {rules.map((rule) => (
                          <li
                            key={rule.id}
                            className="border-l pl-3"
                            style={{ borderColor: "#C9A22766" }}
                          >
                            <span
                              className="block text-[11px] font-semibold"
                              style={{ color: "var(--color-ink)" }}
                            >
                              {rule.title}
                            </span>
                            {rule.body && (
                              <span className="mt-0.5 block text-[11px] leading-relaxed text-[var(--color-muted)]">
                                {rule.body}
                              </span>
                            )}
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <p className="text-[11px] leading-relaxed text-[var(--color-muted)]">
                        House rules are provided with your booking confirmation.
                      </p>
                    )}

                    <p className="mt-4 text-[11px] leading-relaxed text-[var(--color-muted)]">
                      The full{" "}
                      <a
                        href="/terms"
                        className="underline underline-offset-4"
                        style={{ color: "var(--color-accent)" }}
                      >
                        terms and conditions
                      </a>{" "}
                      apply to this stay.
                    </p>
                  </div>
                </details>

                <Section index={6} title="Guest declaration">
                  <CheckRow
                    checked={declaredAccurate}
                    onChange={setDeclaredAccurate}
                    label="I confirm that the information provided is accurate."
                  />
                  <CheckRow
                    checked={acceptedRules}
                    onChange={setAcceptedRules}
                    label="I agree to abide by the property's house rules."
                  />
                </Section>
              </>
            )}
          </div>

          {error && (
            <p
              ref={errorRef}
              aria-live="polite"
              className="flex items-start gap-2 rounded-xl border p-3 text-[11.5px] leading-relaxed"
              style={{ borderColor: "#E4C9BE", background: "#FBF1ED", color: "#8C3B28" }}
            >
              <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" /> {error}
            </p>
          )}

          <div className="flex items-center gap-2.5 pt-1">
            {step > 1 && (
              <button
                type="button"
                onClick={goBack}
                className="inline-flex items-center gap-1.5 rounded-xl border bg-white/60 px-4 py-3.5 text-[12.5px] font-semibold transition-colors hover:bg-white"
                style={{ borderColor: "#E8E2D8", color: "var(--color-accent)" }}
              >
                <ArrowLeft className="h-3.5 w-3.5" /> Back
              </button>
            )}

            {isLast ? (
              <button
                type="submit"
                disabled={!canSubmit}
                className="cc-cta flex flex-1 items-center justify-center gap-2 rounded-xl px-6 py-3.5 text-[13px] font-semibold text-white shadow-[0_10px_24px_rgba(69,83,96,0.20)] transition-[background-color,box-shadow,transform] duration-200 hover:shadow-[0_14px_30px_rgba(69,83,96,0.26)] disabled:cursor-not-allowed disabled:opacity-40 disabled:shadow-none"
                style={{ background: "var(--color-accent)" }}
              >
                {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
                {submitting ? "Submitting…" : "Submit registration"}
              </button>
            ) : (
              <button
                type="button"
                onClick={goNext}
                className="cc-cta flex flex-1 items-center justify-center gap-2 rounded-xl px-6 py-3.5 text-[13px] font-semibold text-white shadow-[0_10px_24px_rgba(69,83,96,0.20)] transition-[background-color,box-shadow,transform] duration-200 hover:shadow-[0_14px_30px_rgba(69,83,96,0.26)]"
                style={{ background: "var(--color-accent)" }}
              >
                Continue <ArrowRight className="h-3.5 w-3.5" />
              </button>
            )}
          </div>

          {isLast && problem && (
            <p
              id="submit-hint"
              aria-live="polite"
              className="text-center text-[10.5px] leading-relaxed text-[#9A9284]"
            >
              {problem}
            </p>
          )}

          <div className="flex items-center justify-between gap-3 pt-1 text-[10.5px]">
            {saveState === "saving" && (
              <span className="inline-flex items-center gap-1.5 text-[#9A9284]">
                <Loader2 className="h-3 w-3 animate-spin" /> Saving…
              </span>
            )}
            {saveState === "saved" && (
              <span
                className="inline-flex items-center gap-1.5 font-medium"
                style={{ color: "var(--color-accent)" }}
              >
                <Check className="h-3 w-3" /> Saved
              </span>
            )}
            {saveState === "idle" && (
              <span className="text-[#B5AE9F]">Your details save automatically.</span>
            )}
            {saveState === "error" && <span className="text-[#8C3B28]" />}
          </div>
        </form>

        <div className="pb-2 pt-4 text-center">
          <div className="mx-auto mb-3 h-px w-10" style={{ background: "#C9A22766" }} aria-hidden />
          <p className="text-[10.5px] leading-relaxed text-[#B5AE9F]">
            Your details and ID picture are stored privately and used only to verify who is
            staying.
          </p>
        </div>
      </div>
    </main>
  );
}

/* -------------------------------------------------------------------------- */
/*  Presentational helpers that need the form's own handlers                   */
/* -------------------------------------------------------------------------- */

/** "1 Dec 2026", for the review page. Falls back to the raw value. */
function prettyDate(value: string): string {
  if (!value) return "—";
  const date = new Date(`${value}T00:00:00`);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(date);
}

/**
 * The last page's summary. Deliberately read-only: the pencil is a jump back to
 * the page that owns the field, so there is one place to edit each value and no
 * duplicated validation.
 */
function ReviewCard({
  rows,
  onEdit,
}: {
  rows: { label: string; value: string; step: number }[];
  onEdit: (step: number) => void;
}) {
  return (
    <section
      className="overflow-hidden rounded-2xl border bg-white shadow-[0_1px_2px_rgba(30,36,43,0.05)]"
      style={{ borderColor: "#E8E2D8" }}
    >
      <div
        className="flex items-baseline justify-between gap-3 border-b px-5 py-3.5 sm:px-6"
        style={{ borderColor: "#F2EDE4" }}
      >
        <h2 className="font-display text-[17px] tracking-tight" style={{ color: "var(--color-ink)" }}>
          Check your details
        </h2>
        <span className="text-[9px] font-semibold uppercase tracking-[0.12em] text-[#B5AE9F]">
          Before you submit
        </span>
      </div>

      <dl className="divide-y" style={{ borderColor: "#F5F1EA" }}>
        {rows.map((row) => (
          <div key={row.label} className="flex items-start gap-3 px-5 py-2.5 sm:px-6">
            <dt className="w-[68px] shrink-0 pt-0.5 text-[9.5px] font-semibold uppercase tracking-[0.1em] text-[#B5AE9F]">
              {row.label}
            </dt>
            <dd className="min-w-0 flex-1 text-[12px] leading-relaxed text-[#3A3A3A]">
              {row.value}
            </dd>
            <button
              type="button"
              onClick={() => onEdit(row.step)}
              className="shrink-0 text-[10.5px] font-semibold underline underline-offset-4"
              style={{ color: "var(--color-accent)" }}
            >
              Edit
            </button>
          </div>
        ))}
      </dl>
    </section>
  );
}

/** The DOMException name from a rejected getUserMedia, or "". */
function cameraErrorName(error: unknown): string {
  if (error && typeof error === "object" && "name" in error) {
    return String((error as { name?: unknown }).name ?? "");
  }
  return "";
}

/**
 * Turn a getUserMedia rejection into something a guest at the gate can act on.
 * The browser's own error names are the only reliable signal here — every
 * device fails differently, and "camera blocked" was being shown for all of
 * them, including laptops with no camera at all.
 */
function describeCameraFailure(error: unknown): string {
  switch (cameraErrorName(error)) {
    case "NotAllowedError":
    case "SecurityError":
      return "Your browser is blocking the camera for this page. Allow camera access from the lock icon in the address bar, then try again — or skip this step, your ID picture is enough.";
    case "NotFoundError":
    case "OverconstrainedError":
      return "No camera was found on this device. You can skip this step — your ID picture is enough.";
    case "NotReadableError":
    case "AbortError":
      return "The camera is in use by another app. Close it and try again, or skip this step — your ID picture is enough.";
    default:
      return "The camera could not be started on this device. You can skip this step — your ID picture is enough.";
  }
}

/**
 * The database speaks to a developer; the screen speaks to a guest at a gate.
 * These are the failures we have actually seen, mapped to something honest.
 */
function describeSaveError(message: string): string {
  if (/row-level security|permission denied/i.test(message)) {
    return "We could not save this yet — registration is not switched on for the site. Please see the manager; your details are still on this device.";
  }
  if (/column .* does not exist|schema cache/i.test(message)) {
    return "We could not save this yet — the database is missing a field. Please see the manager; your details are still on this device.";
  }
  if (/failed to fetch|network/i.test(message)) {
    return "No connection to the server. Your details are saved on this device — try again when you have signal.";
  }
  return `We could not save this yet: ${message}`;
}
