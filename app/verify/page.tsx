// app/verify/page.tsx
// ---------------------------------------------------------------------------
// Guest registration route — the kiosk every arrival passes through.
//
//   No booking reference is collected any more. The form is opened by the guest
//   (or handed over at the gate) and stands on its own: who is staying, how to
//   reach them, which document they presented, which nights, and the
//   declaration.
//
// There is nothing to read from the request, so this is a plain Server
// Component with no searchParams: the page is static, which is what a kiosk
// that never carries per-guest state in the URL should be.
//
// The form itself, its validation and its storage rules live in VerifyForm.tsx.
// ---------------------------------------------------------------------------

import type { Metadata } from "next";
import VerifyForm from "./VerifyForm";

export const metadata: Metadata = {
  title: "Guest registration · Cosy Crest",
  // A per-guest form has no business in an index.
  robots: { index: false, follow: false },
};

export default function VerifyPage() {
  return <VerifyForm />;
}
