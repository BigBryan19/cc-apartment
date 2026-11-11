// app/verify/page.tsx
// ---------------------------------------------------------------------------
// Pre-check-in verification — kiosk route.
//
// RULES OF THIS PAGE
//
//   1. The camera is mandatory. If it is blocked, the form locks and tells the
//      guest exactly how to re-allow it. There is no "continue anyway" path: the
//      photo is what ties a face to the booking at the gate.
//   2. No navigation. This route renders no navbar, no footer and no back link,
//      so a guest cannot wander into the marketing site mid-check-in.
//   3. Consent is explicit. The photo is taken from the visible preview only
//      after the guest ticks the consent box — the camera is disclosed, shown,
//      and never used from behind the page.
//   4. House rules come from the database (public.house_rules), so the property
//      manager can change them from Admin → House rules without a deploy.
//
// The text saves itself while the guest types, so a dropped connection or a
// closed tab loses nothing; Submit finalises the record and returns them to the
// site.
// ---------------------------------------------------------------------------

"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  AlertCircle,
  Camera,
  CameraOff,
  Check,
  Loader2,
  Lock,
  RefreshCw,
  ShieldCheck,
} from "lucide-react";
import { createClient, isSupabaseConfigured } from "../utils/supabase";

const TABLE = "guest_verifications";
const BUCKET = "verifications";
const RULES_TABLE = "house_rules";
const AUTOSAVE_DELAY_MS = 1500;

type SaveState = "idle" | "saving" | "saved" | "error";
type CameraState = "starting" | "ready" | "denied" | "unsupported";

interface GuestForm {
  name: string;
  contact: string;
  email: string;
}

interface HouseRule {
  id: string;
  title: string;
  body: string | null;
}

export default function VerifyPage() {
  const configured = isSupabaseConfigured();
  const router = useRouter();

  /**
   * One id per visit. The row is keyed on it, so the debounced auto-save updates
   * the same record instead of creating a guest on every pause.
   */
  const [sessionId] = useState(() =>
    typeof crypto !== "undefined" && "randomUUID" in crypto
      ? crypto.randomUUID()
      : `v-${Date.now()}-${Math.random().toString(16).slice(2)}`,
  );

  const [form, setForm] = useState<GuestForm>({ name: "", contact: "", email: "" });
  const [saveState, setSaveState] = useState<SaveState>("idle");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);

  const [cameraState, setCameraState] = useState<CameraState>("starting");
  const [photoConsent, setPhotoConsent] = useState(false);
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [photo, setPhoto] = useState<string | null>(null);
  const [photoUploading, setPhotoUploading] = useState(false);
  const [photoPath, setPhotoPath] = useState<string | null>(null);

  const [rules, setRules] = useState<HouseRule[]>([]);

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const cameraReady = cameraState === "ready";

  /* ---------------- camera ---------------- */

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

  useEffect(() => {
    void startCamera();
    return () => stopCamera();
  }, [startCamera, stopCamera]);

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

  /* ---------------- saving ---------------- */

  const save = useCallback(
    async (record: GuestForm, path: string | null, finalise = false) => {
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
            photo_path: path,
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

  useEffect(() => {
    if (done) return;
    if (!form.name.trim() && !form.contact.trim()) return;

    const timer = setTimeout(() => void save(form, photoPath), AUTOSAVE_DELAY_MS);
    return () => clearTimeout(timer);
  }, [form, photoPath, save, done]);

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

  const uploadBlob = useCallback(
    async (blob: Blob): Promise<string | null> => {
      const path = `${sessionId}/${Date.now()}.jpg`;
      const { error: uploadError } = await createClient()
        .storage.from(BUCKET)
        .upload(path, blob, { contentType: "image/jpeg", upsert: true });
      if (uploadError) {
        setError(`Photo could not be uploaded: ${uploadError.message}`);
        return null;
      }
      setPhotoPath(path);
      return path;
    },
    [sessionId],
  );

  const takePhoto = useCallback(async () => {
    if (!cameraReady) return;
    if (!photoConsent) {
      setError("Tick the photo consent box first — the picture is only taken with your agreement.");
      return;
    }
    setError("");
    const blob = await captureFrame();
    if (!blob) {
      setError("The camera is not ready yet. Give it a second and try again.");
      return;
    }
    setPhoto(URL.createObjectURL(blob));
    setPhotoUploading(true);
    const path = await uploadBlob(blob);
    if (path) await save(form, path);
    setPhotoUploading(false);
  }, [cameraReady, captureFrame, form, photoConsent, save, uploadBlob]);

  /* ---------------- submit ---------------- */

  const canSubmit =
    cameraReady &&
    Boolean(form.name.trim()) &&
    Boolean(form.contact.trim()) &&
    photoConsent &&
    termsAccepted &&
    !submitting;

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError("");

    if (!cameraReady) return setError("Allow camera access to continue.");
    if (!form.name.trim()) return setError("Please enter your full name.");
    if (!form.contact.trim()) return setError("Please enter a contact number.");
    if (!photoConsent) return setError("Please agree to the verification photo.");
    if (!termsAccepted) return setError("Please accept the terms and house rules.");

    setSubmitting(true);

    let finalPath = photoPath;
    if (!finalPath) {
      const blob = await captureFrame();
      if (blob) finalPath = await uploadBlob(blob);
    }

    await save(form, finalPath, true);
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
            Verified — thank you
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

  const blocked = cameraState === "denied" || cameraState === "unsupported";

  return (
    <main className="min-h-screen bg-stone-50 px-5 py-10">
      <div className="mx-auto max-w-lg">
        {/* Welcome. No navigation, no exit — this is a required step. */}
        <header className="mb-7">
          <span className="inline-flex items-center gap-2 rounded-full bg-white px-3 py-1 text-[11px] font-semibold uppercase tracking-wider text-stone-500 ring-1 ring-stone-200">
            <ShieldCheck className="h-3.5 w-3.5" /> Required for access
          </span>
          <h1 className="mt-4 font-display text-3xl tracking-tight text-stone-900">
            Verify your stay
          </h1>
          <p className="mt-2 text-sm leading-relaxed text-stone-600">
            We need these details, a photo and your agreement to the house rules before we can
            hand over the keys. It takes about a minute, and it means no paperwork at the gate.
          </p>
        </header>

        {!configured && (
          <div className="mb-6 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
            This form is not connected to the database yet. Nothing you enter will be saved.
          </div>
        )}

        {/* Camera. Mandatory, and the reason the form is locked when it fails. */}
        <section className="rounded-3xl border border-stone-200 bg-white p-6 shadow-sm">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h2 className="text-sm font-semibold text-stone-900">Your photo</h2>
              <p className="mt-1 text-xs leading-relaxed text-stone-500">
                So the person at the gate knows who is arriving.
              </p>
            </div>
            <span
              className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-semibold ${
                cameraReady
                  ? "bg-emerald-50 text-emerald-700"
                  : "bg-stone-100 text-stone-500"
              }`}
            >
              <span
                className={`h-1.5 w-1.5 rounded-full ${
                  cameraReady ? "bg-emerald-500" : "bg-stone-400"
                }`}
              />
              {cameraReady ? "Camera on" : "Camera off"}
            </span>
          </div>

          <div className="relative mt-4 aspect-[4/3] overflow-hidden rounded-2xl bg-stone-900">
            <video
              ref={videoRef}
              playsInline
              muted
              className={`h-full w-full object-cover ${cameraReady ? "" : "opacity-0"}`}
            />
            {photo && (
              <img
                src={photo}
                alt="Your verification photo"
                className="absolute inset-0 h-full w-full object-cover"
              />
            )}

            {!cameraReady && !photo && (
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 p-6 text-center">
                {cameraState === "starting" ? (
                  <>
                    <Loader2 className="h-7 w-7 animate-spin text-stone-400" />
                    <p className="text-xs text-stone-300">Starting the camera…</p>
                  </>
                ) : (
                  <>
                    <CameraOff className="h-7 w-7 text-stone-400" />
                    <p className="max-w-[16rem] text-xs leading-relaxed text-stone-300">
                      The camera is blocked, so this form is locked.
                    </p>
                  </>
                )}
              </div>
            )}
          </div>

          {/* Blocked state: a real instruction, not a shrug. */}
          {blocked && (
            <div className="mt-4 rounded-2xl border border-red-200 bg-red-50 p-4">
              <p className="flex items-center gap-2 text-sm font-semibold text-red-900">
                <AlertCircle className="h-4 w-4" /> Camera access is required
              </p>
              <p className="mt-2 text-xs leading-relaxed text-red-800">
                {cameraState === "unsupported"
                  ? "This browser cannot use a camera. Open this page in Chrome or Safari on a phone or laptop with a camera."
                  : "You must allow the camera before you can continue."}
              </p>
              {cameraState === "denied" && (
                <ol className="mt-3 space-y-1.5 text-xs leading-relaxed text-red-800">
                  <li className="flex gap-2">
                    <Lock className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                    Click the <strong className="font-semibold">lock icon</strong> (or the camera
                    icon) in your browser&apos;s address bar.
                  </li>
                  <li>2. Set <strong className="font-semibold">Camera</strong> to “Allow”.</li>
                  <li>3. Reload this page, or press the button below.</li>
                </ol>
              )}
              {cameraState === "denied" && (
                <button
                  type="button"
                  onClick={() => void startCamera()}
                  className="mt-4 inline-flex items-center gap-2 rounded-full bg-red-900 px-4 py-2 text-xs font-semibold text-white"
                >
                  <RefreshCw className="h-3.5 w-3.5" /> Try the camera again
                </button>
              )}
            </div>
          )}

          <label className="mt-4 flex items-start gap-3 text-xs leading-relaxed text-stone-600">
            <input
              type="checkbox"
              checked={photoConsent}
              onChange={(event) => setPhotoConsent(event.target.checked)}
              className="mt-0.5 h-4 w-4 rounded border-stone-300"
            />
            <span>
              I agree to a photo being taken for check-in verification. It is used only to match
              me to my booking and is deleted after the stay.
            </span>
          </label>

          <div className="mt-4 flex items-center gap-3">
            <button
              type="button"
              onClick={() => void takePhoto()}
              disabled={!cameraReady || photoUploading || !photoConsent}
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

        {/* Details — locked until the camera is on. */}
        <form onSubmit={onSubmit} className="mt-5 space-y-5">
          <section
            className={`rounded-3xl border border-stone-200 bg-white p-6 shadow-sm transition-opacity ${
              cameraReady ? "" : "pointer-events-none opacity-50"
            }`}
            aria-disabled={!cameraReady}
          >
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

          {/* House rules — from the database, editable in Admin. */}
          {rules.length > 0 && (
            <section className="rounded-3xl border border-stone-200 bg-white p-6 shadow-sm">
              <h2 className="text-sm font-semibold text-stone-900">House rules</h2>
              <ul className="mt-4 space-y-3">
                {rules.map((rule) => (
                  <li key={rule.id} className="border-l-2 border-stone-200 pl-3">
                    <span className="block text-xs font-semibold text-stone-800">{rule.title}</span>
                    {rule.body && (
                      <span className="mt-0.5 block text-xs leading-relaxed text-stone-600">
                        {rule.body}
                      </span>
                    )}
                  </li>
                ))}
              </ul>
            </section>
          )}

          <label className="flex items-start gap-3 rounded-2xl border border-stone-200 bg-white p-4 text-xs leading-relaxed text-stone-700">
            <input
              type="checkbox"
              checked={termsAccepted}
              onChange={(event) => setTermsAccepted(event.target.checked)}
              className="mt-0.5 h-4 w-4 rounded border-stone-300"
            />
            <span>
              By filling this form you accept our terms and conditions and house rules.
            </span>
          </label>

          {error && (
            <p className="flex items-start gap-2 rounded-2xl border border-red-200 bg-red-50 p-3 text-xs leading-relaxed text-red-800">
              <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" /> {error}
            </p>
          )}

          <button
            type="submit"
            disabled={!canSubmit}
            className="flex w-full items-center justify-center gap-2 rounded-2xl bg-stone-900 px-6 py-4 text-sm font-semibold text-white transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"
          >
            {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
            {submitting ? "Submitting…" : "Submit Details"}
          </button>

          {!cameraReady && (
            <p className="text-center text-[11px] text-stone-500">
              The form unlocks once the camera is on.
            </p>
          )}

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
