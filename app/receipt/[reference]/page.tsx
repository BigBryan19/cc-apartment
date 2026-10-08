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
//
// The reference doubles as the access token for this page, so it must stay
// unguessable. `generateReference()` uses 8 random bytes (64 bits) for exactly
// that reason — see app/lib/paystack.ts. /receipt/ is disallowed in robots.txt
// so an indexed copy can never leak a guest's name, email and phone number.
// ---------------------------------------------------------------------------

import Link from "next/link";
import { loadReceiptData, renderReceiptHtml } from "@/app/lib/receipt";
import { isServiceRoleConfigured } from "@/app/lib/supabase-server";
import PrintButton from "./PrintButton";

export const dynamic = "force-dynamic";

const CONTACT_PHONE = "+233 54 053 4870";
const CONTACT_EMAIL = "officialcosycrestaparts@gmail.com";
const CONTACT_WHATSAPP = "https://wa.me/2330540534870";

/** Shared shell for the two failure states, so both look deliberate. */
function ReceiptNotice({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <main className="flex min-h-screen items-center justify-center bg-[#f4f4f5] px-4 py-16">
      <div className="w-full max-w-lg rounded-2xl border border-[#e4e4e4] bg-white p-8 text-center shadow-sm">
        <h1 className="text-lg font-semibold text-[#222]">{title}</h1>
        <div className="mt-3 space-y-3 text-sm leading-relaxed text-[#717171]">
          {children}
        </div>

        <div className="mt-7 flex flex-col gap-3 sm:flex-row sm:justify-center">
          <a
            href={CONTACT_WHATSAPP}
            target="_blank"
            rel="noopener noreferrer"
            className="rounded-lg bg-[#455360] px-6 py-3 text-sm font-semibold text-white transition-opacity hover:opacity-90"
          >
            Message us on WhatsApp
          </a>
          <Link
            href="/"
            className="rounded-lg border border-[#e4e4e4] px-6 py-3 text-sm font-semibold text-[#222] transition-colors hover:bg-[#f4f4f5]"
          >
            Back to home
          </Link>
        </div>

        <p className="mt-6 text-xs text-[#9ca3af]">
          {CONTACT_PHONE} · {CONTACT_EMAIL}
        </p>
      </div>
    </main>
  );
}

export default async function ReceiptPage({
  params,
}: {
  params: Promise<{ reference: string }>;
}) {
  const { reference } = await params;

  // No service role key means we cannot look anything up. Do not pretend the
  // document does not exist when the real problem is configuration — and do not
  // imply the guest did something wrong.
  if (!isServiceRoleConfigured()) {
    console.error(
      "[receipt] SUPABASE_SERVICE_ROLE_KEY is not set — no receipt can be looked up.",
    );

    return (
      <ReceiptNotice title="We can't load your receipt right now">
        <p>
          This is a problem on our side, not yours — your payment and your
          reservation are unaffected.
        </p>
        <p>
          Please contact us and we will send your receipt straight over. It
          usually takes us a few minutes.
        </p>
      </ReceiptNotice>
    );
  }

  const data = await loadReceiptData(decodeURIComponent(reference));

  // Two different situations land here, and they need different advice:
  //   • a mistyped or truncated link, and
  //   • a genuine payment that was taken while the booking could not be saved
  //     (which is what a missing SUPABASE_SERVICE_ROLE_KEY used to cause).
  // The guest cannot tell them apart, so the copy covers both without blaming
  // them — and asks for the one thing that resolves either: the reference.
  if (!data) {
    console.warn(`[receipt] no booking matched reference=${reference}`);

    return (
      <ReceiptNotice title="We couldn't find that receipt">
        <p>
          The link may be incomplete — they are long, and chat apps sometimes
          cut them short. Try copying the whole link from your confirmation
          email.
        </p>
        <p>
          If you have already paid and you can see the charge on your statement,
          send us the reference below and we will find it and reissue your
          receipt.
        </p>
        <p className="rounded-xl border border-[#e4e4e4] bg-[#f9f9f9] p-3">
          <span className="block text-xs uppercase tracking-widest text-[#9ca3af]">
            Reference from the link
          </span>
          <span className="mt-1 block break-all font-mono text-xs font-semibold text-[#222]">
            {decodeURIComponent(reference) || "(none)"}
          </span>
        </p>
      </ReceiptNotice>
    );
  }

  const html = renderReceiptHtml(data, { siteUrl: "" });

  return (
    <>
      <PrintButton />
      {/* The receipt markup comes from app/lib/receipt.ts, where every
          interpolated value is HTML-escaped.

          pb-28 keeps the floating action bar from covering the footer on a
          short viewport; print:pb-0 drops it again so it is not in the PDF. */}
      <div className="pb-28 print:pb-0" dangerouslySetInnerHTML={{ __html: html }} />
    </>
  );
}
