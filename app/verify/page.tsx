// app/verify/page.tsx
// ---------------------------------------------------------------------------
// Guest registration route — the kiosk every arrival passes through.
//
//   /verify                 → the guest types their booking reference
//   /verify?ref=CC-1042     → the reference is prefilled and locked
//
// A Server Component on purpose. `searchParams` is only readable on the server
// in the App Router, and reading it here means the form's first paint already
// contains the reference: no flash of an empty field, and no hydration
// mismatch from a client-side `useEffect` mutating state after mount.
//
// The route is therefore dynamic (ƒ in the build output) rather than static.
// That costs nothing — the form was already a client component talking to
// Supabase, and a kiosk is never served from a CDN cache.
//
// The form itself, its validation and its storage rules live in VerifyForm.tsx.
// ---------------------------------------------------------------------------

import type { Metadata } from "next";
import VerifyForm from "./VerifyForm";

export const metadata: Metadata = {
  title: "Guest registration · Cosy Crest",
  // A per-guest form has no business in an index, and the reference in the
  // query string should never end up in a search result.
  robots: { index: false, follow: false },
};

/** Query keys accepted for the reference, in priority order. */
const REFERENCE_KEYS = ["ref", "reference", "booking"] as const;

function normaliseReference(value: string | string[] | undefined): string {
  const first = Array.isArray(value) ? value[0] : value;
  return (first ?? "").trim().toUpperCase();
}

export default async function VerifyPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const fromQuery = REFERENCE_KEYS.map((key) => normaliseReference(params[key])).find(Boolean);

  return <VerifyForm initialReference={fromQuery ?? ""} />;
}
