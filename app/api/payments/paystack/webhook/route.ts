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
// Configure in Paystack Dashboard > Settings > API Keys & Webhooks:
//   https://<your-domain>/api/payments/paystack/webhook
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
      "[paystack/webhook] SUPABASE_SERVICE_ROLE_KEY missing — cannot update booking.",
    );
    return NextResponse.json(
      { error: "Server storage not configured." },
      { status: 503 },
    );
  }

  const supabase = createServiceClient();

  // Full update — includes the payment_* columns added by supabase/schema.sql.
  const fullUpdate = {
    status: "confirmed",
    payment_status: "paid",
    payment_reference: reference,
    paid_at: paid_at ?? new Date().toISOString(),
    amount_paid: typeof amount === "number" ? amount / 100 : null,
    currency: currency ?? "GHS",
  };

  let resolvedBookingId: string | null =
    typeof bookingId === "string" && bookingId !== "" ? bookingId : null;

  try {
    // Preferred path: update by the booking id carried in metadata.
    if (resolvedBookingId) {
      const { error } = await supabase
        .from("bookings")
        .update(fullUpdate)
        .eq("id", resolvedBookingId);

      if (error) {
        console.warn(
          "[paystack/webhook] full update by id failed, retrying minimal:",
          error.message,
        );

        // Columns may not exist yet (migration not run) — still mark confirmed.
        await supabase
          .from("bookings")
          .update({ status: "confirmed" })
          .eq("id", resolvedBookingId);
      }
    } else {
      // Fallback path: no bookingId in metadata, match on the reference.
      const { data, error } = await supabase
        .from("bookings")
        .update(fullUpdate)
        .eq("payment_reference", reference)
        .select("id");

      if (error) {
        console.warn(
          "[paystack/webhook] update by reference failed:",
          error.message,
        );
        return NextResponse.json(
          { received: true, warning: "Booking not matched.", reference },
          { status: 200 },
        );
      }

      resolvedBookingId = data?.[0]?.id ?? null;
    }

    // Close the paid dates off for this property. Deliberately non-fatal: the
    // charge has already succeeded, so a problem here must not turn into a 500
    // that makes Paystack retry the whole event indefinitely.
    const blockedDates = resolvedBookingId
      ? await blockDatesForBooking(supabase, resolvedBookingId, reference)
      : null;

    // Also non-fatal: the guest has paid, so a mail outage must not turn into a
    // 500 that makes Paystack replay the whole event. Stamps receipt_sent_at,
    // so the /verify route will not send a second copy.
    const receiptEmail = await sendReceiptOnce(reference);

    return NextResponse.json({
      received: true,
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
  return NextResponse.json({
    ok: true,
    configured: isPaystackConfigured(),
    storage: isServiceRoleConfigured(),
    hint: "POST signed Paystack events to this endpoint.",
  });
}
