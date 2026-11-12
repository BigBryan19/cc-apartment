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
//   4. The booking reference arrives in the link (`/verify?ref=CC-1042`) and is
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
import { AlertCircle, Check, ChevronDown, Loader2, Lock, ShieldCheck } from "lucide-react";
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
/** Sections that count toward the progress rail. Section 5 is optional. */
const REQUIRED_SECTIONS = 5;

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
  reference: string;
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
  reference: "",
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

export default function VerifyForm({
  /** Taken from the URL by the server component, upper-cased and trimmed. */
  initialReference,
}: {
  initialReference: string;
}) {
  const configured = isSupabaseConfigured();
  const router = useRouter();

  /**
   * One id per visit. The row is keyed on it, so the debounced auto-save
   * updates the same record instead of creating a guest on every pause.
   */
  const [sessionId] = useState(() =>
    typeof crypto !== "undefined" && "randomUUID" in crypto
      ? crypto.randomUUID()
      : `v-${Date.now()}-${Math.random().toString(16).slice(2)}`,
  );

  const [form, setForm] = useState<GuestForm>(() => ({
    ...EMPTY_FORM,
    reference: initialReference,
  }));
  const [saveState, setSaveState] = useState<SaveState>("idle");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);

  /** True when the reference came from the link and should not be edited. */
  const [referenceLocked, setReferenceLocked] = useState(Boolean(initialReference));

  /* ---------------- identification ---------------- */

  const [idFile, setIdFile] = useState<File | null>(null);
  const [idPreview, setIdPreview] = useState<string | null>(null);
  const [idPath, setIdPath] = useState<string | null>(null);
  const [idUploading, setIdUploading] = useState(false);
  const idInputRef = useRef<HTMLInputElement | null>(null);

  /* ---------------- optional selfie ---------------- */

  const [cameraState, setCameraState] = useState<CameraState>("idle");
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
    if (typeof navigator === "undefined" || !navigator.mediaDevices?.getUserMedia) {
      setCameraState("unsupported");
      return;
    }
    setCameraState("starting");
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "user", width: { ideal: 720 } },
        audio: false,
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play().catch(() => {});
      }
      setCameraState("ready");
    } catch {
      setCameraState("denied");
    }
  }, []);

  useEffect(() => () => stopCamera(), [stopCamera]);

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
            booking_reference: record.reference.trim().toUpperCase() || null,
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
        setError(writeError.message);
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
    Boolean(form.reference.trim()) ||
    Boolean(form.fullName.trim()) ||
    Boolean(form.phone.trim()) ||
    Boolean(idPath);

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

  /** First thing wrong with the form, or null when it is ready to submit. */
  const problem = useMemo((): string | null => {
    if (!form.reference.trim())
      return "Enter the booking reference from your confirmation.";
    if (!form.fullName.trim()) return "Enter your full name as it appears on your ID.";
    if (!isPlausiblePhone(form.phone)) return "Enter a phone number we can reach you on.";
    if (!isPlausiblePhone(form.whatsapp)) return "Enter your WhatsApp number.";
    if (!isPlausibleEmail(form.email)) return "Enter a valid email address.";
    if (!form.idType) return "Choose the type of ID you are presenting.";
    if (!idPath && !idFile) return "Upload a clear picture of your ID.";
    if (!form.checkIn) return "Choose your check-in date.";
    if (!form.checkOut) return "Choose your check-out date.";
    if (form.checkOut < form.checkIn) return "Check-out cannot be before check-in.";
    const guests = Number.parseInt(form.guests, 10);
    if (!Number.isFinite(guests) || guests < 1)
      return "Enter how many guests are staying.";
    if (guests > MAX_GUESTS) return `Enter a number of guests up to ${MAX_GUESTS}.`;
    if (!declaredAccurate) return "Confirm that the information you gave is accurate.";
    if (!acceptedRules) return "Agree to the house rules to continue.";
    return null;
  }, [
    form,
    idPath,
    idFile,
    declaredAccurate,
    acceptedRules,
  ]);

  const canSubmit = !problem && !submitting;

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError("");

    if (problem) {
      setError(problem);
      errorRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
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
    // Kiosk hand-off: the guest is returned to the site, not left on a dead end.
    setTimeout(() => router.replace("/"), 1400);
  }

  /* ---------------- progress ---------------- */

  /**
   * Per-section completion, from the same predicates the submit check uses.
   * One source of truth: a section cannot show a tick while its fields would
   * still block submission.
   */
  const sectionDone = {
    personal: Boolean(form.fullName.trim()),
    contact:
      isPlausiblePhone(form.phone) &&
      isPlausiblePhone(form.whatsapp) &&
      isPlausibleEmail(form.email),
    identification: Boolean(form.idType) && Boolean(idPath ?? idFile),
    booking:
      Boolean(form.reference.trim()) &&
      Boolean(form.checkIn) &&
      Boolean(form.checkOut) &&
      form.checkOut >= form.checkIn &&
      Number.parseInt(form.guests, 10) >= 1,
  };

  const completedSections = [
    sectionDone.personal,
    sectionDone.contact,
    sectionDone.identification,
    sectionDone.booking,
    declaredAccurate && acceptedRules,
  ].filter(Boolean).length;

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

  return (
    <main className="min-h-screen" style={{ background: "var(--color-canvas-warm)" }}>
      <VerifyStyles />
      {/* The property, not a form. The photograph is the first thing a guest
          sees at the gate, and it says "you have arrived" better than copy.
          Text sits on a bottom-heavy scrim so it stays legible whatever part
          of the frame is behind it. */}
      <header className="relative isolate flex min-h-[320px] items-end overflow-hidden sm:min-h-[360px]">
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
        {/* Brass hairline where the photograph meets the page. */}
        <div
          className="absolute inset-x-0 bottom-0 h-px"
          style={{ background: "linear-gradient(90deg, transparent, #C9A227, transparent)" }}
          aria-hidden
        />

        <div className="relative mx-auto w-full max-w-lg px-5 pb-7 pt-6">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/cc-horinzontal.png"
            alt="Cosy Crest Apartments"
            className="h-8 w-auto self-start drop-shadow-[0_1px_6px_rgba(0,0,0,0.45)]"
          />

          <span className="mt-8 inline-flex w-fit items-center gap-1.5 rounded-full border border-white/25 bg-white/10 px-2.5 py-1 text-[9.5px] font-semibold uppercase tracking-[0.14em] text-white/90 backdrop-blur">
            <ShieldCheck className="h-3 w-3" /> Required for access
          </span>

          <h1 className="mt-3 font-display text-[34px] leading-[1.08] tracking-tight text-white drop-shadow-sm">
            Guest registration
          </h1>
          <p className="mt-2 max-w-sm text-[13px] leading-relaxed text-white/80">
            A picture of your ID and a few details, and the keys are yours. About a minute.
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
        </div>
      </header>

      <div className="mx-auto max-w-lg px-5 pb-14">
        {/* Progress rail. Pinned while scrolling: a six-section form on a phone
            is long, and a guest who cannot see the end of it abandons it. */}
        <div
          className="sticky top-0 z-20 -mx-5 mb-4 flex items-center gap-3 px-5 py-3 backdrop-blur"
          style={{ background: "rgba(251,249,246,0.92)", boxShadow: "0 1px 0 #E8E2D8" }}
        >
          <div className="h-[3px] flex-1 overflow-hidden rounded-full bg-[#E9E2D6]">
            <div
              className="h-full rounded-full transition-[width] duration-500 ease-out"
              style={{
                width: `${(completedSections / REQUIRED_SECTIONS) * 100}%`,
                background: "var(--color-accent)",
              }}
            />
          </div>
          <span className="shrink-0 text-[9.5px] font-semibold uppercase tracking-[0.14em] text-[#9A9284]">
            {completedSections} of {REQUIRED_SECTIONS} complete
          </span>
        </div>

        {!configured && (
          <div
            className="mb-4 rounded-xl border p-3.5 text-[12px] leading-relaxed"
            style={{ borderColor: "#E8DCC0", background: "#FBF6E9", color: "#7A6520" }}
          >
            This form is not connected to the database yet. Nothing you enter will be saved.
          </div>
        )}

        <form onSubmit={onSubmit} className="space-y-4">
          {/* 1 — Personal information */}
          <Section index={1} title="Personal information" complete={sectionDone.personal}>
            <Field
              label="Full name"
              required
              value={form.fullName}
              onChange={(value) => set("fullName", value)}
              placeholder="As it appears on your ID"
              autoComplete="name"
            />
          </Section>

          {/* 2 — Contact information */}
          <Section
            index={2}
            title="Contact information"
            description="We use these only to reach you about this stay."
            complete={sectionDone.contact}
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
            <Field
              label="WhatsApp number"
              required
              value={form.whatsapp}
              onChange={(value) => set("whatsapp", value)}
              placeholder="Usually the same as your phone number"
              autoComplete="tel"
              inputMode="tel"
            />
            <Field
              label="Email address"
              required
              type="email"
              value={form.email}
              onChange={(value) => set("email", value)}
              placeholder="you@example.com"
              autoComplete="email"
              inputMode="email"
            />
          </Section>

          {/* 3 — Identification */}
          <Section
            index={3}
            title="Identification"
            complete={sectionDone.identification}
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
              onSelect={(file) => void acceptIdFile(file)}
              onClear={clearIdFile}
            />
          </Section>

          {/* Optional selfie. Collapsed until the guest asks for it, so the
              camera is never opened just because the page loaded. */}
          <SelfieCard
            state={cameraState}
            videoRef={videoRef}
            preview={selfie}
            consent={photoConsent}
            uploading={selfieUploading}
            onConsent={setPhotoConsent}
            onStart={() => void startCamera()}
            onCapture={() => void takeSelfie()}
            onRemove={removeSelfie}
          />

          {/* 4 — Booking details */}
          <Section index={4} title="Booking details" complete={sectionDone.booking}>
            <div>
              <Field
                label="Booking reference"
                required
                value={form.reference}
                onChange={(value) => set("reference", value.toUpperCase())}
                placeholder="From your confirmation, e.g. CC-1042"
                autoComplete="off"
                readOnly={referenceLocked}
              />
              {referenceLocked && (
                <button
                  type="button"
                  onClick={() => setReferenceLocked(false)}
                  className="mt-2 inline-flex items-center gap-1.5 text-[11px] font-medium text-stone-500 underline underline-offset-4 hover:text-stone-900"
                >
                  <Lock className="h-3 w-3" /> Taken from your link — use a different reference
                </button>
              )}
            </div>

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

          {/* 5 — Emergency contact */}
          <Section
            index={5}
            title="Emergency contact"
            optional
            description="Someone we may call if we cannot reach you during the stay."
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

          {/* House rules, folded away. A native <details> rather than a scripted
              accordion: it opens without JavaScript, is keyboard accessible by
              default, and keeps the page short for someone checking in at the
              airport. */}
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
                    <li key={rule.id} className="border-l pl-3" style={{ borderColor: "#C9A22766" }}>
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

          {/* 6 — Declaration */}
          <Section index={6} title="Guest declaration" complete={declaredAccurate && acceptedRules}>
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

          <div className="flex items-center justify-center gap-2 pt-1 text-[10.5px]">
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
          </div>

          {error && (
            <p
              ref={errorRef}
              className="flex items-start gap-2 rounded-xl border p-3 text-[11.5px] leading-relaxed"
              style={{ borderColor: "#E4C9BE", background: "#FBF1ED", color: "#8C3B28" }}
            >
              <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" /> {error}
            </p>
          )}

          <button
            type="submit"
            disabled={!canSubmit}
            aria-describedby={problem ? "submit-hint" : undefined}
            className="cc-cta flex w-full items-center justify-center gap-2 rounded-xl px-6 py-4 text-[13px] font-semibold tracking-[0.02em] text-white shadow-[0_10px_24px_rgba(69,83,96,0.20)] transition-[background-color,box-shadow,transform] duration-200 hover:shadow-[0_14px_30px_rgba(69,83,96,0.26)] disabled:cursor-not-allowed disabled:opacity-40 disabled:shadow-none"
            style={{ background: "var(--color-accent)" }}
          >
            {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
            {submitting ? "Submitting…" : "Submit registration"}
          </button>

          {problem && hasProgress && (
            <p
              id="submit-hint"
              aria-live="polite"
              className="text-center text-[10.5px] leading-relaxed text-[#9A9284]"
            >
              {problem}
            </p>
          )}

          <div className="pb-2 text-center">
            <div
              className="mx-auto mb-3 h-px w-10"
              style={{ background: "#C9A22766" }}
              aria-hidden
            />
            <p className="text-[10.5px] leading-relaxed text-[#B5AE9F]">
              Your details and ID picture are stored privately and used only to verify who is
              staying.
            </p>
          </div>
        </form>
      </div>
    </main>
  );
}
