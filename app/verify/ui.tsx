// app/verify/ui.tsx
// ---------------------------------------------------------------------------
// The presentational half of /verify.
//
// Split out from VerifyForm.tsx so the skin can change without touching the
// validation, autosave or storage logic. Nothing in here holds state or talks
// to Supabase.
//
// DESIGN LANGUAGE — "Crest ivory"
//
//   Ivory canvas, charcoal ink, the brand slate as the only accent, and brass
//   hairlines used sparingly (numbers, rules, the upload zone). Headings are
//   Playfair via `font-display`, which globals.css reserves for display text;
//   labels and UI stay in the sans stack.
//
//   Colours come from the design-system variables rather than hard-coded greys,
//   so an owner who changes the accent in Admin -> Settings changes this page
//   too. The two literal values are the brass and the warm hairline, which are
//   not part of the token set.
// ---------------------------------------------------------------------------

"use client";

import React from "react";
import {
  Camera,
  CameraOff,
  Check,
  ChevronDown,
  IdCard,
  Loader2,
  RefreshCw,
  Trash2,
  Upload,
} from "lucide-react";

export type CameraState = "idle" | "starting" | "ready" | "denied" | "unsupported";

/**
 * Rules that need the accent variable, which Tailwind utilities cannot express
 * cleanly alongside an inline colour. Rendered once by the form.
 */
export function VerifyStyles() {
  return (
    <style>{`
      .cc-field::placeholder { color: #B5AE9F; }
      .cc-field:focus {
        border-color: var(--color-accent) !important;
        box-shadow: 0 0 0 3px color-mix(in srgb, var(--color-accent) 14%, transparent);
        background: #fff;
        outline: none;
      }
      .cc-cta:hover:not(:disabled) { background: var(--color-accent-deep) !important; }
      .cc-cta:active:not(:disabled) { transform: translateY(1px); }
    `}</style>
  );
}

/* -------------------------------------------------------------------------- */
/*  Tokens used repeatedly                                                     */
/* -------------------------------------------------------------------------- */

/** Warm hairline — a touch warmer than --color-line, so it sits on ivory. */
const HAIRLINE = "#E8E2D8";
const BRASS = "#C9A227";
const FIELD = "#FDFBF8";
const INK = "var(--color-ink)";
const ACCENT = "var(--color-accent)";

/**
 * A numbered card. The number is not decoration: guests arrive with a
 * confirmation email that lists the same sections, and staff ask for "section
 * three" at the gate. Once every field in a section is valid the number is
 * replaced by a tick, so the guest can see progress without scrolling back.
 */
export function Section({
  index,
  title,
  description,
  optional,
  complete,
  children,
}: {
  index: number;
  title: string;
  description?: string;
  optional?: boolean;
  complete?: boolean;
  children: React.ReactNode;
}) {
  return (
    <section className="overflow-hidden rounded-2xl border bg-white shadow-[0_1px_2px_rgba(30,36,43,0.05)]" style={{ borderColor: HAIRLINE }}>
      <div className="flex items-start gap-3 border-b px-5 py-4 sm:px-6" style={{ borderColor: "#F2EDE4" }}>
        <span
          className="mt-0.5 grid h-8 w-8 shrink-0 place-items-center rounded-full text-[11px] font-semibold tabular-nums transition-colors"
          style={
            complete
              ? { background: ACCENT, color: "#fff" }
              : { background: "#F5F0E7", color: ACCENT, boxShadow: `inset 0 0 0 1px ${BRASS}33` }
          }
          aria-hidden
        >
          {complete ? <Check className="h-3.5 w-3.5" /> : String(index).padStart(2, "0")}
        </span>

        <div className="min-w-0 flex-1">
          <h2
            className="flex flex-wrap items-baseline gap-2 font-display text-[19px] leading-tight tracking-tight"
            style={{ color: INK }}
          >
            {title}
            {optional && (
              <span
                className="rounded-full px-2 py-0.5 text-[9px] font-semibold uppercase tracking-[0.12em]"
                style={{ background: "#F5F0E7", color: "#9A9284" }}
              >
                Optional
              </span>
            )}
          </h2>
          {description && (
            <p className="mt-1 text-[11.5px] leading-relaxed text-[var(--color-muted)]">
              {description}
            </p>
          )}
        </div>
      </div>
      <div className="space-y-4 px-5 py-5 sm:px-6">{children}</div>
    </section>
  );
}

export function Field({
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
      <label
        htmlFor={id}
        className="mb-1.5 block text-[10px] font-semibold uppercase tracking-[0.12em] text-[var(--color-muted)]"
      >
        {label}
        {required && (
          <span className="ml-1" style={{ color: BRASS }} aria-hidden>
            *
          </span>
        )}
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
        className={`cc-field w-full rounded-lg border px-3.5 py-2.5 text-sm text-[var(--color-ink)] outline-none ${
          readOnly ? "cursor-not-allowed text-[var(--color-muted)]" : ""
        }`}
        style={{
          borderColor: HAIRLINE,
          background: readOnly ? "#F4F0E8" : FIELD,
        }}
      />
    </div>
  );
}

export function SelectField({
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
      <label
        htmlFor={id}
        className="mb-1.5 block text-[10px] font-semibold uppercase tracking-[0.12em] text-[var(--color-muted)]"
      >
        {label}
        {required && (
          <span className="ml-1" style={{ color: BRASS }} aria-hidden>
            *
          </span>
        )}
      </label>
      <div className="relative">
        <select
          id={id}
          value={value}
          required={required}
          onChange={(event) => onChange(event.target.value)}
          className="cc-field w-full appearance-none rounded-lg border px-3.5 py-2.5 pr-10 text-sm text-[var(--color-ink)] outline-none"
          style={{ borderColor: HAIRLINE, background: FIELD }}
        >
          <option value="">{placeholder ?? "Choose one"}</option>
          {options.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
        <ChevronDown className="pointer-events-none absolute right-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[#B5AE9F]" />
      </div>
    </div>
  );
}

/**
 * The ID document. Deliberately one input with no `capture` attribute: the
 * browser then offers camera *and* photo library, so a guest who already
 * photographed their card can pick it instead of retaking it.
 */
export function IdUpload({
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
      <span className="mb-1.5 block text-[10px] font-semibold uppercase tracking-[0.12em] text-[var(--color-muted)]">
        Picture of your ID
        <span className="ml-1" style={{ color: BRASS }} aria-hidden>
          *
        </span>
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
        <div className="overflow-hidden rounded-xl border" style={{ borderColor: HAIRLINE }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={preview}
            alt="Your uploaded ID"
            className="max-h-64 w-full object-contain"
            style={{ background: "#F7F3EB" }}
          />
          <div
            className="flex items-center justify-between gap-3 border-t px-4 py-2.5"
            style={{ borderColor: HAIRLINE, background: "#FDFBF8" }}
          >
            <span
              className="inline-flex items-center gap-1.5 text-[11px] font-semibold"
              style={{ color: uploading ? "#9A9284" : ACCENT }}
            >
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
            <div className="flex items-center gap-4">
              <button
                type="button"
                onClick={() => inputRef.current?.click()}
                className="text-[11px] font-medium underline underline-offset-4 transition-colors hover:text-[var(--color-ink)]"
                style={{ color: ACCENT }}
              >
                Replace
              </button>
              <button
                type="button"
                onClick={onClear}
                className="inline-flex items-center gap-1 text-[11px] font-medium text-[#A8A090] transition-colors hover:text-[#8C3B28]"
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
          className="group flex w-full flex-col items-center justify-center gap-2.5 rounded-xl border border-dashed px-6 py-7 text-center transition-colors hover:bg-white"
          style={{ borderColor: `${BRASS}80`, background: "#FBF7EF" }}
        >
          <span
            className="grid h-10 w-10 place-items-center rounded-full transition-colors"
            style={{ background: "#F5EEDF" }}
          >
            <IdCard className="h-5 w-5" style={{ color: "#A88B2A" }} />
          </span>
          <span
            className="inline-flex items-center gap-1.5 text-xs font-semibold"
            style={{ color: INK }}
          >
            <Upload className="h-3.5 w-3.5" /> Upload a picture of your ID
          </span>
          <span className="text-[11px] leading-relaxed text-[#A8A090]">
            JPG, PNG or HEIC, up to 8 MB. Lay the card flat and fill the frame.
          </span>
        </button>
      )}
    </div>
  );
}

/**
 * A declaration line. Styled as a signature block rather than a checkbox on a
 * form: brass rule down the left, generous padding, the tick on the right.
 */
export function CheckRow({
  checked,
  onChange,
  label,
}: {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label: string;
}) {
  return (
    <label
      className="flex cursor-pointer items-center gap-3 rounded-r-xl border-l-2 py-3 pl-3.5 pr-3 transition-colors"
      style={{
        borderColor: checked ? BRASS : `${BRASS}55`,
        background: checked ? "#FBF7EF" : "transparent",
      }}
    >
      <input
        type="checkbox"
        checked={checked}
        onChange={(event) => onChange(event.target.checked)}
        className="h-4 w-4 shrink-0 cursor-pointer rounded"
        style={{ accentColor: ACCENT }}
      />
      <span className="flex-1 text-xs leading-relaxed text-[#3A3A3A]">{label}</span>
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
export function SelfieCard({
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
    <section
      className="overflow-hidden rounded-2xl border bg-white shadow-[0_1px_2px_rgba(30,36,43,0.05)]"
      style={{ borderColor: HAIRLINE }}
    >
      <div className="flex items-start justify-between gap-4 px-5 py-4 sm:px-6">
        <div>
          <h2 className="flex flex-wrap items-baseline gap-2 font-display text-[19px] leading-tight tracking-tight" style={{ color: INK }}>
            A photo of yourself
            <span
              className="rounded-full px-2 py-0.5 text-[9px] font-semibold uppercase tracking-[0.12em]"
              style={{ background: "#F5F0E7", color: "#9A9284" }}
            >
              Optional
            </span>
          </h2>
          <p className="mt-1 text-[11.5px] leading-relaxed text-[var(--color-muted)]">
            Speeds things up at the gate, but your ID is what we actually need.
          </p>
        </div>
        {preview && (
          <span
            className="inline-flex shrink-0 items-center gap-1 rounded-full px-2.5 py-1 text-[10px] font-semibold"
            style={{ background: "#F5EEDF", color: "#8A6F1E" }}
          >
            <Check className="h-3 w-3" /> Added
          </span>
        )}
      </div>

      <div className="px-5 pb-5 sm:px-6">
        {preview ? (
          <div className="flex items-center gap-3">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={preview} alt="Your verification photo" className="h-20 w-20 rounded-lg object-cover" />
            <div className="min-w-0">
              <p className="text-[11px] leading-relaxed text-[var(--color-muted)]">
                {uploading ? "Uploading…" : "Attached to your registration."}
              </p>
              <button
                type="button"
                onClick={onRemove}
                className="mt-1.5 inline-flex items-center gap-1 text-[11px] font-medium text-[#A8A090] underline underline-offset-4 transition-colors hover:text-[#8C3B28]"
              >
                <Trash2 className="h-3 w-3" /> Remove photo
              </button>
            </div>
          </div>
        ) : ready ? (
          <>
            <div className="relative aspect-[4/3] overflow-hidden rounded-xl bg-[#1E242B] ring-1 ring-black/5">
              <video ref={videoRef} playsInline muted className="h-full w-full object-cover" />
            </div>
            <label className="mt-4 flex items-start gap-3 text-xs leading-relaxed text-[#3A3A3A]">
              <input
                type="checkbox"
                checked={consent}
                onChange={(event) => onConsent(event.target.checked)}
                className="mt-0.5 h-4 w-4 rounded"
                style={{ accentColor: ACCENT }}
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
              className="mt-3 inline-flex items-center gap-2 rounded-full px-4 py-2 text-xs font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-40"
              style={{ background: ACCENT }}
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
              <div className="mb-3 rounded-xl border border-[#EDE3D2] bg-[#FBF7EF] p-3.5">
                <p className="flex items-center gap-2 text-xs font-semibold" style={{ color: "#8A6F1E" }}>
                  <CameraOff className="h-4 w-4" /> Camera not available
                </p>
                <p className="mt-1.5 text-[11px] leading-relaxed text-[#7A7264]">
                  {state === "unsupported"
                    ? "This browser can't use a camera. You can skip this step — your ID picture is enough to complete registration."
                    : "Allow the camera from the lock icon in your address bar, then try again. You can also skip this step entirely."}
                </p>
              </div>
            )}
            <button
              type="button"
              onClick={onStart}
              className="inline-flex items-center gap-2 rounded-full border px-4 py-2 text-xs font-semibold transition-colors hover:bg-[#FDFBF8]"
              style={{ borderColor: HAIRLINE, color: ACCENT }}
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
            <p className="mt-2.5 text-[10.5px] text-[#B5AE9F]">
              Nothing is recorded until you press Take photo.
            </p>
          </>
        )}
      </div>
    </section>
  );
}
