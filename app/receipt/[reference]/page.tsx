// app/receipt/[reference]/page.tsx
// ---------------------------------------------------------------------------
// Printable receipt for a paid booking.
//
// Server-rendered so the reference is checked against the database before any
// guest detail is emitted — the HTML is never sent to someone who does not
// hold a valid reference.
//
// The markup is the exact same string the confirmation email uses, so what the
// guest downloads is what they were sent. "Download" is the browser's own
// Print → Save as PDF, which needs no PDF library on the server.
// ---------------------------------------------------------------------------

import { notFound } from "next/navigation";
import { loadReceiptData, renderReceiptHtml } from "@/app/lib/receipt";
import { isServiceRoleConfigured } from "@/app/lib/supabase-server";
import PrintButton from "./PrintButton";

export const dynamic = "force-dynamic";

export default async function ReceiptPage({
  params,
}: {
  params: Promise<{ reference: string }>;
}) {
  const { reference } = await params;

  // No service role key means we cannot look anything up — do not pretend the
  // document does not exist when the real problem is configuration.
  if (!isServiceRoleConfigured()) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#f4f4f5] px-4">
        <div className="max-w-md rounded-2xl border border-[var(--color-line)] bg-white p-8 text-center">
          <h1 className="text-lg font-semibold text-[var(--color-ink)]">
            Receipts are unavailable
          </h1>
          <p className="mt-2 text-sm text-[var(--color-muted)]">
            The server is not configured to look up bookings. Please contact us
            and we will send your receipt directly.
          </p>
        </div>
      </main>
    );
  }

  const data = await loadReceiptData(decodeURIComponent(reference));

  if (!data) notFound();

  const html = renderReceiptHtml(data, { siteUrl: "" });

  return (
    <>
      <PrintButton />
      {/* The receipt markup comes from app/lib/receipt.ts, where every
          interpolated value is HTML-escaped. */}
      <div dangerouslySetInnerHTML={{ __html: html }} />
    </>
  );
}
