// app/verify/page.tsx
// ---------------------------------------------------------------------------
// Pre-check-in verification.
//
// WHAT THIS DOES
//
//   A guest confirms who is arriving before they travel: name, a contact number,
//   an optional email, and a photograph. Text saves itself while they type, so a
//   dropped connection loses nothing. The button at the bottom finalises the
//   record and gives them something to show at the door.
//
// WHAT IT DELIBERATELY DOES NOT DO
//
//   The camera is never used behind the guest's back. It asks permission, shows
//   the preview, and says in plain words when a photo will be taken. A hidden
//   capture that fires while someone types is covert image collection: they
//   cannot consent to a camera they were not told about, and under Ghana's Data
//   Protection Act 2012 a photograph of a person is personal data that needs a
//   lawful basis — consent being the obvious one here.
//
//   The compromise that keeps the flow frictionless: the preview is always
//   visible, the guest can take their own photo, and if they skip that button the
//   frame is captured at submit time from the same visible preview — with the
//   consent box on screen the whole time. Nothing is captured before they tick
//   it.
// ---------------------------------------------------------------------------

"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  AlertCircle,
  Camera,
  CameraOff,
  Check,
  Loader2,
  RefreshCw,
  ShieldCheck,
} from "lucide-react";
import { createClient, isSupabaseConfigured } from "../utils/supabase";

const TABLE = "guest_verifications";
const BUCKET = "verifications";
const AUTOSAVE_DELAY_MS = 1500;

type SaveState = "idle" | "saving" | "saved" | "error";

interface GuestForm {
  name: string;
  contact: string;
  email: string;
}

export default function VerifyPage() {
  const configured = isSupabaseConfigured();

  /**
   * One id per visit. The row is keyed on it, so every auto-save updates the
   * same record instead of creating a new guest on each keystroke pause.
   */
  const [sessionId] = useState(() =>
    typeof crypto !== "undefined" && "randomUUID" in crypto
      ? crypto.randomUUID()
      : `v-${Date.now()}-${Math.random().toString(16).slice(2)}`,
  );

  const [form, setForm] = useState<GuestForm>({ name: "", contact: "", email: "" });
  const [saveState, setSaveState] = useState<SaveState>("idle");
  const [error, setError] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const [cameraState, setCameraState] = useState<"idle" | "ready" | "denied" | "unsupported">("idle");
  const [consent, setConsent] = useState(false);
  const [photo, setPhoto] = useState<string | null>(null);
  const [photoUploading, setPhotoUploading] = useState(false);
  const [photoPath, setPhotoPath] = useState<string | null>(null);

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  /* ---------------- camera ---------------- */

  const stopCamera = useCallback(() => {
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function start() {
      if (typeof navigator === "undefined" || !navigator.mediaDevices?.getUserMedia) {
        setCameraState("unsupported");
        return;
      }
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: "user", width: { ideal: 720 } },
          audio: false,
        });
        if (cancelled) {
          stream.getTracks().forEach((track) => track.stop());
          return;
        }
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play().catch(() => {});
        }
        setCameraState("ready");
      } catch {
        if (!cancelled) setCameraState("denied");
      }
    }

    void start();
    return () => {
      cancelled = true;
      stopCamera();
    };
  }, [stopCamera]);

  /* ---------------- text auto-save ---------------- */

  const save = useCallback(
    async (record: GuestForm, photo: string | null, finalise = false) => {
      if (!configured) return;
      if (!record.name.trim() && !record.contact.trim()) return;

      setSaveState("saving");
      const { error: writeError } = await createClient()
        .from(TABLE)
        .upsert(
          {
            session_id: sessionId,
            full_name: record.name.trim() || null,
            contact_number: record.contact.trim() || null,
            email: record.email.trim() || null,
            photo_path: photo,
            status: finalise ? "submitted" : "draft",
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

  // Debounced: the guest pauses for 1.5s, the draft is written silently.
  useEffect(() => {
    if (submitted) return;
    if (!form.name.trim() && !form.contact.trim()) return;

    const timer = setTimeout(() => {
      void save(form, photoPath);
    }, AUTOSAVE_DELAY_MS);

    return () => clearTimeout(timer);
  }, [form, photoPath, save, submitted]);

  /* ---------------- photo ---------------- */

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

  const takePhoto = useCallback(async () => {
    if (!consent) {
      setError("Please tick the consent box first — the photo is only taken with your agreement.");
      return;
    }
    setError("");
    const blob = await captureFrame();
    if (!blob) {
      setError("The camera is not ready yet. Give it a second and try again.");
      return;
    }
    setPhoto(URL.createObjectURL(blob));
    await upload(blob);
  }, [captureFrame, consent]);

  const upload = useCallback(
    async (blob: Blob) => {
      if (!configured) return;
      setPhotoUploading(true);
      const path = `${sessionId}/${Date.now()}.jpg`;
      const { error: uploadError } = await createClient()
        .storage.from(BUCKET)
        .upload(path, blob, { contentType: "image/jpeg", upsert: true });

      if (uploadError) {
        setError(`Photo could not be uploaded: ${uploadError.message}`);
        setPhotoUploading(false);
        return;
      }
      setPhotoPath(path);
      await save(form, path);
      setPhotoUploading(false);
    },
    [configured, form, save, sessionId],
  );

  /* ---------------- submit ---------------- */

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError("");

    if (!form.name.trim()) return setError("Please enter your full name.");
    if (!form.contact.trim()) return setError("Please enter a contact number.");

    setSubmitting(true);

    /*
     * If they took a photo, it is already uploaded. If they did not, the frame
     * comes from the preview that has been on screen the whole time, and only
     * when consent was given.
     */
    let finalPhoto = photoPath;
    if (!finalPhoto && consent && cameraState === "ready") {
      const blob = await captureFrame();
      if (blob) {
        const path = `${sessionId}/${Date.now()}.jpg`;
        const { error: uploadError } = await createClient()
          .storage.from(BUCKET)
          .upload(path, blob, { contentType: "image/jpeg", upsert: true });
        if (!uploadError) finalPhoto = path;
        else setError(`Photo could not be uploaded: ${uploadError.message}`);
      }
    }

    await save(form, finalPhoto, true);
    setSubmitting(false);
    setSubmitted(true);
  }

  if (submitted) {
    return (
      <main className="min-h-screen bg-stone-50 px-5 py-16">
        <div className="mx-auto max-w-lg rounded-3xl border border-stone-200 bg-white p-10 text-center shadow-sm">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-emerald-50">
            <Check className="h-7 w-7 text-emerald-600" />
          </div>
          <h1 className="mt-6 font-display text-2xl tracking-tight text-stone-900">
            Details received
          </h1>
          <p className="mt-3 text-sm leading-relaxed text-stone-600">
            Thank you, {form.name.split(" ")[0]}. Your check-in details are with us. We&apos;ll
            confirm by WhatsApp on {form.contact}.
          </p>
          <p className="mt-6 text-xs text-stone-500">
            Bring the same phone number when you arrive — that is how we match you to the
            booking.
          </p>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-stone-50 px-5 py-12">
      <div className="mx-auto max-w-lg">
        <header className="mb-8">
          <span className="inline-flex items-center gap-2 rounded-full bg-white px-3 py-1 text-[11px] font-semibold uppercase tracking-wider text-stone-500 ring-1 ring-stone-200">
            <ShieldCheck className="h-3.5 w-3.5" /> Pre check-in
          </span>
          <h1 className="mt-4 font-display text-3xl tracking-tight text-stone-900">
            Verify your stay
          </h1>
          <p className="mt-2 text-sm leading-relaxed text-stone-600">
            A minute now saves paperwork at the door. Your details save as you type, so you
            can close this page and come back.
          </p>
        </header>

        {!configured && (
          <div className="mb-6 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
            This form is not connected to the database yet. Nothing you enter will be saved.
          </div>
        )}

        <form onSubmit={onSubmit} className="space-y-5">
          {/* Camera — visible at all times, permission asked on load */}
          <section className="rounded-3xl border border-stone-200 bg-white p-6 shadow-sm">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="text-sm font-semibold text-stone-900">Your photo</h2>
                <p className="mt-1 text-xs leading-relaxed text-stone-500">
                  So the person at the gate knows who is arriving.
                </p>
              </div>
              {cameraState === "ready" && (
                <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-1 text-[11px] font-semibold text-emerald-700">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" /> Camera on
                </span>
              )}
            </div>

            <div className="relative mt-4 aspect-[4/3] overflow-hidden rounded-2xl bg-stone-100">
              <video
                ref={videoRef}
                playsInline
                muted
                className={`h-full w-full object-cover ${
                  cameraState === "ready" ? "" : "opacity-0"
                }`}
              />
              {photo && (
                <img
                  src={photo}
                  alt="Your verification photo"
                  className="absolute inset-0 h-full w-full object-cover"
                />
              )}
              {cameraState !== "ready" && !photo && (
                <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 p-6 text-center">
                  {cameraState === "denied" || cameraState === "unsupported" ? (
                    <CameraOff className="h-7 w-7 text-stone-400" />
                  ) : (
                    <Loader2 className="h-7 w-7 animate-spin text-stone-400" />
                  )}
                  <p className="text-xs leading-relaxed text-stone-500">
                    {cameraState === "denied"
                      ? "Camera access was blocked. You can still submit — we'll take the photo at check-in."
                      : cameraState === "unsupported"
                        ? "This browser cannot use a camera. You can still submit your details."
                        : "Waiting for camera permission…"}
                  </p>
                </div>
              )}
            </div>

            <label className="mt-4 flex items-start gap-3 text-xs leading-relaxed text-stone-600">
              <input
                type="checkbox"
                checked={consent}
                onChange={(event) => setConsent(event.target.checked)}
                className="mt-0.5 h-4 w-4 rounded border-stone-300"
              />
              <span>
                I agree to a photo being taken for check-in verification. It is used only to
                match me to my booking and is deleted after the stay.
              </span>
            </label>

            <div className="mt-4 flex items-center gap-3">
              <button
                type="button"
                onClick={() => void takePhoto()}
                disabled={cameraState !== "ready" || photoUploading}
                className="inline-flex items-center gap-2 rounded-full bg-stone-900 px-4 py-2 text-xs font-semibold text-white disabled:opacity-40"
              >
                {photoUploading ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : photo ? (
                  <RefreshCw className="h-3.5 w-3.5" />
                ) : (
                  <Camera className="h-3.5 w-3.5" />
                )}
                {photo ? "Retake" : "Take photo"}
              </button>
              {photo && (
                <span className="inline-flex items-center gap-1 text-[11px] font-medium text-emerald-700">
                  <Check className="h-3.5 w-3.5" /> Added
                </span>
              )}
            </div>
          </section>

          {/* Details */}
          <section className="rounded-3xl border border-stone-200 bg-white p-6 shadow-sm">
            <div className="space-y-4">
              <Field
                label="Full name"
                required
                value={form.name}
                onChange={(value) => setForm((prev) => ({ ...prev, name: value }))}
                placeholder="As it appears on your ID"
                autoComplete="name"
              />
              <Field
                label="Contact number"
                required
                value={form.contact}
                onChange={(value) => setForm((prev) => ({ ...prev, contact: value }))}
                placeholder="e.g. 024 000 0000"
                autoComplete="tel"
                inputMode="tel"
              />
              <Field
                label="Email (optional)"
                value={form.email}
                onChange={(value) => setForm((prev) => ({ ...prev, email: value }))}
                placeholder="you@example.com"
                autoComplete="email"
                type="email"
              />
            </div>

            <div className="mt-5 flex items-center gap-2 text-[11px]">
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
          </section>

          {error && (
            <p className="flex items-start gap-2 rounded-2xl border border-red-200 bg-red-50 p-3 text-xs leading-relaxed text-red-800">
              <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" /> {error}
            </p>
          )}

          <button
            type="submit"
            disabled={submitting}
            className="flex w-full items-center justify-center gap-2 rounded-2xl bg-stone-900 px-6 py-4 text-sm font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-50"
          >
            {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
            {submitting ? "Submitting…" : "Submit Details"}
          </button>

          <p className="pb-4 text-center text-[11px] leading-relaxed text-stone-500">
            We keep your name, number and photo only for this stay.
          </p>
        </form>
      </div>
    </main>
  );
}

/* -------------------------------------------------------------------------- */

function Field({
  label,
  value,
  onChange,
  placeholder,
  required,
  type = "text",
  autoComplete,
  inputMode,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  required?: boolean;
  type?: string;
  autoComplete?: string;
  inputMode?: "tel" | "email" | "text";
}) {
  const id = label.toLowerCase().replace(/[^a-z]+/g, "-");
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
        placeholder={placeholder}
        autoComplete={autoComplete}
        inputMode={inputMode}
        onChange={(event) => onChange(event.target.value)}
        className="w-full rounded-xl border border-stone-200 bg-stone-50 px-4 py-3 text-sm text-stone-900 outline-none transition-colors placeholder:text-stone-400 focus:border-stone-900 focus:bg-white"
      />
    </div>
  );
}
