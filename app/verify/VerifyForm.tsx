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
import {
  AlertCircle,
  Camera,
  CameraOff,
  Check,
  ChevronDown,
  IdCard,
  Loader2,
  Lock,
  RefreshCw,
  ShieldCheck,
  Trash2,
  Upload,
  Users,
} from "lucide-react";
import { createClient, isSupabaseConfigured } from "../utils/supabase";

const TABLE = "guest_verifications";
const BUCKET = "verifications";
const RULES_TABLE = "house_rules";
const AUTOSAVE_DELAY_MS = 1500;
/** Phone cameras produce large files; 8 MB accepts a full-resolution photo. */
const MAX_UPLOAD_BYTES = 8 * 1024 * 1024;
const MAX_GUESTS = 40;

type SaveState = "idle" | "saving" | "saved" | "error";
/** `idle` means the camera has not been asked for yet — it is opt-in. */
type CameraState = "idle" | "starting" | "ready" | "denied" | "unsupported";
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

  /* ---------------- views ---------------- */

  if (done) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-stone-50 px-5">
        <div className="w-full max-w-md rounded-3xl border border-stone-200 bg-white p-10 text-center shadow-sm">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-emerald-50">
            <Check className="h-7 w-7 text-emerald-600" />
          </div>
          <h1 className="mt-6 font-display text-2xl tracking-tight text-stone-900">
            Registered — thank you
          </h1>
          <p className="mt-3 text-sm leading-relaxed text-stone-600">
            Your details are with us. Taking you back to Cosy Crest…
          </p>
          <p className="mt-6 inline-flex items-center gap-1.5 text-xs text-stone-500">
            <Loader2 className="h-3 w-3 animate-spin" /> Redirecting
          </p>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-stone-50 px-5 py-10">
      <div className="mx-auto max-w-lg">
        {/* Welcome. No navigation, no exit — this is a required step. */}
        <header className="mb-7">
          <span className="inline-flex items-center gap-2 rounded-full bg-white px-3 py-1 text-[11px] font-semibold uppercase tracking-wider text-stone-500 ring-1 ring-stone-200">
            <ShieldCheck className="h-3.5 w-3.5" /> Required for access
          </span>
          <h1 className="mt-4 font-display text-3xl tracking-tight text-stone-900">
            Guest registration
          </h1>
          <p className="mt-2 text-sm leading-relaxed text-stone-600">
            We need these details and a picture of your ID before we can hand over the keys. It
            takes about a minute, and it means no paperwork at the gate.
          </p>
        </header>

        {!configured && (
          <div className="mb-6 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
            This form is not connected to the database yet. Nothing you enter will be saved.
          </div>
        )}

        <form onSubmit={onSubmit} className="space-y-5">
          {/* 1 — Personal information */}
          <Section index={1} title="Personal information">
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
          <Section index={4} title="Booking details">
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
          <details className="group rounded-3xl border border-stone-200 bg-white shadow-sm [&_summary::-webkit-details-marker]:hidden">
            <summary className="flex cursor-pointer list-none items-center justify-between gap-3 p-6 text-sm font-semibold text-stone-900">
              Read the house rules &amp; terms
              <ChevronDown className="h-4 w-4 text-stone-400 transition-transform duration-200 group-open:rotate-180" />
            </summary>

            <div className="border-t border-stone-100 px-6 pb-6 pt-5">
              {rules.length > 0 ? (
                <ul className="space-y-3">
                  {rules.map((rule) => (
                    <li key={rule.id} className="border-l-2 border-stone-200 pl-3">
                      <span className="block text-xs font-semibold text-stone-800">
                        {rule.title}
                      </span>
                      {rule.body && (
                        <span className="mt-0.5 block text-xs leading-relaxed text-stone-600">
                          {rule.body}
                        </span>
                      )}
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-xs leading-relaxed text-stone-500">
                  House rules are provided with your booking confirmation.
                </p>
              )}

              <p className="mt-5 text-xs leading-relaxed text-stone-500">
                The full{" "}
                <a href="/terms" className="underline underline-offset-4">
                  terms and conditions
                </a>{" "}
                apply to this stay.
              </p>
            </div>
          </details>

          {/* 6 — Declaration */}
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

          <div className="flex items-center gap-2 text-[11px]">
            {saveState === "saving" && (
              <span className="inline-flex items-center gap-1.5 text-stone-500">
                <Loader2 className="h-3 w-3 animate-spin" /> Saving…
              </span>
            )}
            {saveState === "saved" && (
              <span className="inline-flex items-center gap-1.5 text-emerald-700">
                <Check className="h-3 w-3" /> Saved
              </span>
            )}
            {saveState === "idle" && (
              <span className="text-stone-400">Your details save automatically.</span>
            )}
          </div>

          {error && (
            <p
              ref={errorRef}
              className="flex items-start gap-2 rounded-2xl border border-red-200 bg-red-50 p-3 text-xs leading-relaxed text-red-800"
            >
              <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" /> {error}
            </p>
          )}

          <button
            type="submit"
            disabled={!canSubmit}
            aria-describedby={problem ? "submit-hint" : undefined}
            className="flex w-full items-center justify-center gap-2 rounded-2xl bg-stone-900 px-6 py-4 text-sm font-semibold text-white transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"
          >
            {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
            {submitting ? "Submitting…" : "Submit registration"}
          </button>

          {problem && hasProgress && (
            <p
              id="submit-hint"
              aria-live="polite"
              className="text-center text-[11px] leading-relaxed text-stone-500"
            >
              {problem}
            </p>
          )}

          <p className="pb-4 text-center text-[11px] leading-relaxed text-stone-500">
            Your details and ID picture are stored privately and used only to verify who is
            staying.
          </p>
        </form>
      </div>
    </main>
  );
}

/* -------------------------------------------------------------------------- */
/*  Presentational pieces                                                      */
/* -------------------------------------------------------------------------- */

/**
 * A numbered card. The number is not decoration: guests arrive with a
 * confirmation email that lists the same sections, and staff ask for "section
 * three" at the gate.
 */
function Section({
  index,
  title,
  description,
  optional,
  children,
}: {
  index: number;
  title: string;
  description?: string;
  optional?: boolean;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-3xl border border-stone-200 bg-white p-6 shadow-sm">
      <div className="flex items-start gap-3">
        <span className="mt-0.5 text-[11px] font-semibold tabular-nums text-stone-400">
          {String(index).padStart(2, "0")}
        </span>
        <div className="min-w-0">
          <h2 className="flex flex-wrap items-baseline gap-2 text-sm font-semibold text-stone-900">
            {title}
            {optional && (
              <span className="rounded-full bg-stone-100 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-stone-500">
                Optional
              </span>
            )}
          </h2>
          {description && (
            <p className="mt-1 text-xs leading-relaxed text-stone-500">{description}</p>
          )}
        </div>
      </div>
      <div className="mt-5 space-y-4">{children}</div>
    </section>
  );
}

function Field({
  label,
  value,
  onChange,
  placeholder,
  required,
  readOnly,
  type = "text",
  autoComplete,
  inputMode,
  min,
  max,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  required?: boolean;
  readOnly?: boolean;
  type?: "text" | "email" | "tel" | "date" | "number";
  autoComplete?: string;
  inputMode?: "tel" | "email" | "text" | "numeric";
  min?: string | number;
  max?: string | number;
}) {
  const id = `field-${label.toLowerCase().replace(/[^a-z]+/g, "-")}`;
  return (
    <div>
      <label htmlFor={id} className="mb-1.5 block text-xs font-semibold text-stone-700">
        {label}
        {required && <span className="ml-1 text-stone-400">*</span>}
      </label>
      <input
        id={id}
        type={type}
        value={value}
        required={required}
        readOnly={readOnly}
        placeholder={placeholder}
        autoComplete={autoComplete}
        inputMode={inputMode}
        min={min}
        max={max}
        onChange={(event) => onChange(event.target.value)}
        className={`w-full rounded-xl border border-stone-200 px-4 py-3 text-sm text-stone-900 outline-none transition-colors placeholder:text-stone-400 focus:border-stone-900 focus:bg-white ${
          readOnly ? "cursor-not-allowed bg-stone-100 text-stone-500" : "bg-stone-50"
        }`}
      />
    </div>
  );
}

function SelectField({
  label,
  value,
  onChange,
  options,
  placeholder,
  required,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: { value: string; label: string }[];
  placeholder?: string;
  required?: boolean;
}) {
  const id = `select-${label.toLowerCase().replace(/[^a-z]+/g, "-")}`;
  return (
    <div>
      <label htmlFor={id} className="mb-1.5 block text-xs font-semibold text-stone-700">
        {label}
        {required && <span className="ml-1 text-stone-400">*</span>}
      </label>
      <select
        id={id}
        value={value}
        required={required}
        onChange={(event) => onChange(event.target.value)}
        className="w-full appearance-none rounded-xl border border-stone-200 bg-stone-50 px-4 py-3 text-sm text-stone-900 outline-none transition-colors focus:border-stone-900 focus:bg-white"
      >
        <option value="">{placeholder ?? "Choose one"}</option>
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </div>
  );
}

/**
 * The ID document. Deliberately one input with no `capture` attribute: the
 * browser then offers camera *and* photo library, so a guest who already
 * photographed their card can pick it instead of retaking it.
 */
function IdUpload({
  inputRef,
  preview,
  uploading,
  onSelect,
  onClear,
}: {
  inputRef: React.RefObject<HTMLInputElement | null>;
  preview: string | null;
  uploading: boolean;
  onSelect: (file: File | null) => void;
  onClear: () => void;
}) {
  return (
    <div>
      <span className="mb-1.5 block text-xs font-semibold text-stone-700">
        Picture of your ID<span className="ml-1 text-stone-400">*</span>
      </span>

      <input
        ref={inputRef}
        id="id-upload"
        type="file"
        accept="image/*"
        className="sr-only"
        onChange={(event) => onSelect(event.target.files?.[0] ?? null)}
      />

      {preview ? (
        <div className="overflow-hidden rounded-2xl border border-stone-200 bg-stone-50">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={preview}
            alt="Your uploaded ID"
            className="max-h-64 w-full bg-stone-900/5 object-contain"
          />
          <div className="flex items-center justify-between gap-3 border-t border-stone-200 px-4 py-3">
            <span className="inline-flex items-center gap-1.5 text-[11px] font-medium text-emerald-700">
              {uploading ? (
                <>
                  <Loader2 className="h-3.5 w-3.5 animate-spin" /> Uploading…
                </>
              ) : (
                <>
                  <Check className="h-3.5 w-3.5" /> Added
                </>
              )}
            </span>
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => inputRef.current?.click()}
                className="text-[11px] font-medium text-stone-600 underline underline-offset-4 hover:text-stone-900"
              >
                Replace
              </button>
              <button
                type="button"
                onClick={onClear}
                className="inline-flex items-center gap-1 text-[11px] font-medium text-stone-500 hover:text-red-700"
              >
                <Trash2 className="h-3.5 w-3.5" /> Remove
              </button>
            </div>
          </div>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          className="flex w-full flex-col items-center justify-center gap-2 rounded-2xl border border-dashed border-stone-300 bg-stone-50 px-6 py-8 text-center transition-colors hover:border-stone-400 hover:bg-white"
        >
          <IdCard className="h-6 w-6 text-stone-400" />
          <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-stone-700">
            <Upload className="h-3.5 w-3.5" /> Upload a picture of your ID
          </span>
          <span className="text-[11px] leading-relaxed text-stone-500">
            JPG, PNG or HEIC, up to 8 MB. Lay the card flat and fill the frame.
          </span>
        </button>
      )}
    </div>
  );
}

function CheckRow({
  checked,
  onChange,
  label,
}: {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label: string;
}) {
  return (
    <label className="flex cursor-pointer items-start gap-3 rounded-2xl border border-stone-200 bg-stone-50 p-4 text-xs leading-relaxed text-stone-700 transition-colors hover:bg-white">
      <input
        type="checkbox"
        checked={checked}
        onChange={(event) => onChange(event.target.checked)}
        className="mt-0.5 h-4 w-4 shrink-0 rounded border-stone-300"
      />
      <span>{label}</span>
    </label>
  );
}

/**
 * Optional selfie.
 *
 * The camera stays off until the guest presses the button — no permission
 * prompt on load, no preview of a stranger's room. A blocked camera is a dead
 * end for this card only, never for the form.
 */
function SelfieCard({
  state,
  videoRef,
  preview,
  consent,
  uploading,
  onConsent,
  onStart,
  onCapture,
  onRemove,
}: {
  state: CameraState;
  videoRef: React.RefObject<HTMLVideoElement | null>;
  preview: string | null;
  consent: boolean;
  uploading: boolean;
  onConsent: (value: boolean) => void;
  onStart: () => void;
  onCapture: () => void;
  onRemove: () => void;
}) {
  const ready = state === "ready";
  const blocked = state === "denied" || state === "unsupported";

  return (
    <section className="rounded-3xl border border-stone-200 bg-white p-6 shadow-sm">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="flex flex-wrap items-baseline gap-2 text-sm font-semibold text-stone-900">
            A photo of yourself
            <span className="rounded-full bg-stone-100 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-stone-500">
              Optional
            </span>
          </h2>
          <p className="mt-1 text-xs leading-relaxed text-stone-500">
            Speeds things up at the gate, but your ID is what we actually need.
          </p>
        </div>
        {preview && (
          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-1 text-[11px] font-semibold text-emerald-700">
            <Check className="h-3 w-3" /> Added
          </span>
        )}
      </div>

      {preview ? (
        <div className="mt-4 flex items-center gap-3">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={preview}
            alt="Your verification photo"
            className="h-20 w-20 rounded-xl object-cover"
          />
          <div className="min-w-0">
            <p className="text-[11px] leading-relaxed text-stone-500">
              {uploading ? "Uploading…" : "Attached to your registration."}
            </p>
            <button
              type="button"
              onClick={onRemove}
              className="mt-1.5 inline-flex items-center gap-1 text-[11px] font-medium text-stone-500 underline underline-offset-4 hover:text-red-700"
            >
              <Trash2 className="h-3 w-3" /> Remove photo
            </button>
          </div>
        </div>
      ) : ready ? (
        <>
          <div className="relative mt-4 aspect-[4/3] overflow-hidden rounded-2xl bg-stone-900">
            <video ref={videoRef} playsInline muted className="h-full w-full object-cover" />
          </div>
          <label className="mt-4 flex items-start gap-3 text-xs leading-relaxed text-stone-600">
            <input
              type="checkbox"
              checked={consent}
              onChange={(event) => onConsent(event.target.checked)}
              className="mt-0.5 h-4 w-4 rounded border-stone-300"
            />
            <span>
              I agree to a photo being taken for check-in verification. It is used only to match
              me to my booking.
            </span>
          </label>
          <button
            type="button"
            onClick={onCapture}
            disabled={!consent || uploading}
            className="mt-3 inline-flex items-center gap-2 rounded-full bg-stone-900 px-4 py-2 text-xs font-semibold text-white disabled:opacity-40"
          >
            {uploading ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Camera className="h-3.5 w-3.5" />
            )}
            Take photo
          </button>
        </>
      ) : (
        <>
          {blocked && (
            <div className="mt-4 rounded-2xl border border-stone-200 bg-slate-50 p-4">
              <p className="flex items-center gap-2 text-sm font-medium text-slate-700">
                <CameraOff className="h-4 w-4 text-slate-400" /> Camera not available
              </p>
              <p className="mt-2 text-xs leading-relaxed text-slate-600">
                {state === "unsupported"
                  ? "This browser can't use a camera. You can skip this step — your ID picture is enough to complete registration."
                  : "Allow the camera from the lock icon in your address bar, then try again. You can also skip this step entirely."}
              </p>
            </div>
          )}
          <button
            type="button"
            onClick={onStart}
            className="mt-4 inline-flex items-center gap-2 rounded-full bg-white px-4 py-2 text-xs font-semibold text-stone-700 ring-1 ring-stone-300 transition-colors hover:bg-stone-50"
          >
            {state === "starting" ? (
              <>
                <Loader2 className="h-3.5 w-3.5 animate-spin" /> Starting the camera…
              </>
            ) : blocked ? (
              <>
                <RefreshCw className="h-3.5 w-3.5" /> Try the camera again
              </>
            ) : (
              <>
                <Camera className="h-3.5 w-3.5" /> Turn on the camera
              </>
            )}
          </button>
        </>
      )}

      {!preview && !blocked && (
        <p className="mt-3 flex items-center gap-1.5 text-[11px] text-stone-400">
          <Users className="h-3 w-3" /> Nothing is recorded until you press Take photo.
        </p>
      )}
    </section>
  );
}
