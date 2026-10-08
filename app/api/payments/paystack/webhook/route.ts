// app/api/payments/paystack/webhook/route.ts
// ---------------------------------------------------------------------------
// POST /api/payments/paystack/webhook
//
// Receives Paystack events and flips a booking to PAID / CONFIRMED on
// `charge.success`.
//
// Security: every request is authenticated by verifying the
// `x-paystack-signature` header — HMAC-SHA512 of the *raw* body using
// PAYSTACK_SECRET_KEY. The raw body must be read with `request.text()`;
// re-serialising parsed JSON would change the bytes and break the digest.
//
// The signature proves the event came from Paystack. It does not prove the
// amount is what we asked for, so the recorded total is still reconciled before
// the booking is confirmed — see the AMOUNT RECONCILIATION block below.
//
// Configure in Paystack Dashboard > Settings > API Keys & Webhooks:
//   https://<your-domain>/api/payments/paystack/webhook
//
// NOTE: there is intentionally no rate limit here. Paystack retries with
// backoff, and throttling a signed webhook would turn a transient hiccup into
// permanently lost events. The signature is the control; it is checked before
// anything expensive happens.
// ---------------------------------------------------------------------------

import { NextResponse } from "next/server";
import {
  isPaystackConfigured,
  verifyWebhookSignature,
  type PaystackWebhookEvent,
} from "@/app/lib/paystack";
import {
  createServiceClient,
  isServiceRoleConfigured,
} from "@/app/lib/supabase-server";
import { blockDatesForBooking } from "@/app/lib/booking-holds";
import { sendReceiptOnce } from "@/app/lib/receipt";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Tolerance in major units, to absorb float rounding on subunit conversion. */
const AMOUNT_TOLERANCE = 0.01;

export async function POST(request: Request) {
  if (!isPaystackConfigured()) {
    // 503 tells Paystack to retry once the key is configured.
    return NextResponse.json(
      { error: "Webhook not configured." },
      { status: 503 },
    );
  }

  // Raw body FIRST — required for signature verification.
  const rawBody = await request.text();
  const signature = request.headers.get("x-paystack-signature");

  if (!verifyWebhookSignature(rawBody, signature)) {
    console.warn("[paystack/webhook] rejected: invalid signature");
    return NextResponse.json({ error: "Invalid signature." }, { status: 401 });
  }

  let event: PaystackWebhookEvent;
  try {
    event = JSON.parse(rawBody) as PaystackWebhookEvent;
  } catch {
    return NextResponse.json({ error: "Invalid JSON." }, { status: 400 });
  }

  // Acknowledge everything that is validly signed but not actionable, so
  // Paystack stops retrying.
  if (event.event !== "charge.success") {
    return NextResponse.json({ received: true, ignored: event.event });
  }

  const { reference, amount, currency, paid_at, metadata } = event.data;
  const bookingId =
    metadata && typeof metadata === "object"
      ? (metadata as Record<string, unknown>).bookingId
      : null;

  if (!isServiceRoleConfigured()) {
    console.error(
      "[paystack/webhook] SUPABASE_SERVICE_ROLE_KEY missing — cannot record this payment. " +
        `Guest has been charged: reference=${reference} amount=${amount} ${currency}`,
    );
    // 503 so Paystack retries once the key is added. A silent 200 here would
    // drop a real payment on the floor.
    return NextResponse.json(
      { error: "Server storage not configured." },
      { status: 503 },
    );
  }

  const supabase = createServiceClient();

  const paidAmount = typeof amount === "number" ? amount / 100 : null;

  // Full update — includes the payment_* columns added by supabase/schema.sql.
  const fullUpdate = {
    status: "confirmed",
    payment_status: "paid",
    payment_reference: reference,
    paid_at: paid_at ?? new Date().toISOString(),
    amount_paid: paidAmount,
    currency: currency ?? "GHS",
  };

  const metaId =
    typeof bookingId === "string" && bookingId !== "" ? bookingId : null;

  try {
    // --- Resolve the booking first, so it can be reconciled before writing --
    const { data: booking, error: lookupError } = metaId
      ? await supabase
          .from("bookings")
          .select("id, total_amount, currency")
          .eq("id", metaId)
          .maybeSingle()
      : await supabase
          .from("bookings")
          .select("id, total_amount, currency")
          .eq("payment_reference", reference)
          .maybeSingle();

    if (lookupError) {
      console.warn("[paystack/webhook] lookup failed:", lookupError.message);
      return NextResponse.json(
        { received: true, warning: "Booking not matched.", reference },
        { status: 200 },
      );
    }

    if (!booking) {
      // Money moved but there is no reservation to attach it to. Loud, and 200
      // rather than 500 — a retry will not conjure the missing row, and an
      // endless retry loop helps nobody. A human has to reconcile this.
      console.error(
        `[paystack/webhook] PAID BUT UNMATCHED reference=${reference} ` +
          `amount=${paidAmount} ${currency}`,
      );
      return NextResponse.json({
        received: true,
        matched: false,
        reference,
        warning:
          "Payment received but no booking matched. Manual reconciliation required.",
      });
    }

    const resolvedBookingId = String(booking.id);

    // --- AMOUNT RECONCILIATION -------------------------------------------
    // The signature proves provenance, not correctness. If the recorded total
    // and the settled amount disagree, do not confirm — flag it instead.
    const expectedAmount = Number(booking.total_amount ?? 0);
    const currencyMatches = !booking.currency || booking.currency === currency;

    if (
      expectedAmount > 0 &&
      paidAmount !== null &&
      (Math.abs(paidAmount - expectedAmount) > AMOUNT_TOLERANCE || !currencyMatches)
    ) {
      console.error(
        `[paystack/webhook] AMOUNT MISMATCH reference=${reference} ` +
          `expected=${expectedAmount} ${booking.currency} paid=${paidAmount} ${currency}`,
      );
      return NextResponse.json({
        received: true,
        matched: true,
        confirmed: false,
        reference,
        warning:
          "Amount paid does not match the booking total. Not confirmed — manual review required.",
      });
    }

    const { error: updateError } = await supabase
      .from("bookings")
      .update(fullUpdate)
      .eq("id", resolvedBookingId);

    if (updateError) {
      console.warn(
        "[paystack/webhook] full update failed, retrying minimal:",
        updateError.message,
      );

      // Columns may not exist yet (migration not run) — still mark confirmed.
      await supabase
        .from("bookings")
        .update({ status: "confirmed" })
        .eq("id", resolvedBookingId);
    }

    // Close the paid dates off for this property. Deliberately non-fatal: the
    // charge has already succeeded, so a problem here must not turn into a 500
    // that makes Paystack retry the whole event indefinitely.
    const blockedDates = await blockDatesForBooking(
      supabase,
      resolvedBookingId,
      reference,
    );

    // Also non-fatal: the guest has paid, so a mail outage must not turn into a
    // 500 that makes Paystack replay the whole event. Stamps receipt_sent_at,
    // so the /verify route will not send a second copy.
    const receiptEmail = await sendReceiptOnce(reference);

    return NextResponse.json({
      received: true,
      matched: true,
      confirmed: true,
      bookingId: resolvedBookingId,
      reference,
      blockedDates,
      receiptEmail,
    });
  } catch (error) {
    console.error("[paystack/webhook] unexpected failure:", error);
    // 500 makes Paystack retry with backoff.
    return NextResponse.json(
      { error: "Could not update booking." },
      { status: 500 },
    );
  }
}

/** Paystack (and uptime checks) may probe the endpoint with GET. */
export async function GET() {
  const configured = isPaystackConfigured();
  const storage = isServiceRoleConfigured();

  // Surface the missing-storage state loudly in the logs, because it means
  // paid bookings cannot be recorded at all.
  if (configured && !storage) {
    console.error(
      "[paystack/webhook] HEALTH CHECK FAILED: PAYSTACK_SECRET_KEY is set but " +
        "SUPABASE_SERVICE_ROLE_KEY is not. Paid bookings cannot be recorded, " +
        "receipts cannot be sent, and paid dates will not be blocked.",
    );
  }

  return NextResponse.json({
    ok: true,
    configured,
    storage,
    hint: "POST signed Paystack events to this endpoint.",
  });
}
