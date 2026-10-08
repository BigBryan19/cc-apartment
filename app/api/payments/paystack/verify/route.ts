// app/api/payments/paystack/verify/route.ts
// ---------------------------------------------------------------------------
// GET /api/payments/paystack/verify?reference=CC-XXXX
//
// Called by the /checkout/success page when the guest returns from Paystack.
// Webhooks can be delayed, so the callback path confirms the transaction
// directly against Paystack before showing a success state.
//
// This route is unauthenticated by necessity — the guest arrives here from a
// redirect and holds only the reference. Two things follow from that:
//
//   1. It is rate limited. It calls Paystack, writes to the database and sends
//      an email, so a loop against it is both a DoS vector and a way to burn
//      the Resend quota.
//   2. It reconciles the amount. Paystack's response is treated as a claim to
//      be checked against the stored booking, not as the truth — otherwise a
//      mis-priced or tampered transaction would be confirmed at face value.
// ---------------------------------------------------------------------------

import { NextResponse } from "next/server";
import { isPaystackConfigured, verifyTransaction } from "@/app/lib/paystack";
import {
  createServiceClient,
  isServiceRoleConfigured,
} from "@/app/lib/supabase-server";
import { blockDatesForBooking } from "@/app/lib/booking-holds";
import { sendReceiptOnce } from "@/app/lib/receipt";
import { clientKey, rateLimit } from "@/app/lib/rate-limit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Generous enough for a guest refreshing the success page, tight enough to stop a loop. */
const RATE_LIMIT = { limit: 20, windowMs: 60_000 };

/** Tolerance in major units, to absorb float rounding on subunit conversion. */
const AMOUNT_TOLERANCE = 0.01;

export async function GET(request: Request) {
  const limit = rateLimit(clientKey(request, "verify"), RATE_LIMIT.limit, RATE_LIMIT.windowMs);
  if (!limit.ok) {
    return NextResponse.json(
      { error: "Too many verification attempts. Please wait a moment." },
      { status: 429, headers: { "Retry-After": String(limit.retryAfter) } },
    );
  }

  if (!isPaystackConfigured()) {
    return NextResponse.json(
      { error: "Payment gateway is not configured." },
      { status: 503 },
    );
  }

  const reference = new URL(request.url).searchParams.get("reference");
  if (!reference) {
    return NextResponse.json(
      { error: "A transaction reference is required." },
      { status: 400 },
    );
  }

  try {
    const transaction = await verifyTransaction(reference);
    const isSuccessful = transaction.status === "success";
    const paidAmount = transaction.amount / 100;

    // Everything below is idempotent, so the webhook and this route can both
    // run it without double-charging, double-blocking or double-emailing.
    let receiptEmail: string | null = null;
    let reconciled = true;

    if (isSuccessful && isServiceRoleConfigured()) {
      const supabase = createServiceClient();
      const metaBookingId = transaction.metadata?.bookingId;

      let resolvedId: string | null =
        metaBookingId !== undefined && metaBookingId !== null && metaBookingId !== ""
          ? String(metaBookingId)
          : null;

      // Read the booking first — we need its recorded total to reconcile.
      const { data: booking } = resolvedId
        ? await supabase
            .from("bookings")
            .select("id, total_amount, currency, payment_reference")
            .eq("id", resolvedId)
            .maybeSingle()
        : await supabase
            .from("bookings")
            .select("id, total_amount, currency, payment_reference")
            .eq("payment_reference", transaction.reference)
            .maybeSingle();

      if (!booking) {
        // Either the booking was never written (a configuration failure) or the
        // reference is unknown. Money has moved, so this must be loud.
        console.error(
          `[paystack/verify] PAID BUT UNMATCHED reference=${reference} amount=${paidAmount} ${transaction.currency}`,
        );
        // `successful: false` so the UI does not claim the booking is held, and
        // `needsAttention: true` so it explains *why* rather than showing a bare
        // failure. Money has moved; that has to be said plainly, along with the
        // instruction not to pay again.
        return NextResponse.json({
          status: transaction.status,
          successful: false,
          reconciled: false,
          needsAttention: true,
          reference: transaction.reference,
          amount: paidAmount,
          currency: transaction.currency,
          paidAt: transaction.paid_at ?? null,
          email: transaction.customer?.email ?? null,
          receiptEmail: null,
          error:
            "Your payment went through, but it has not been matched to a reservation yet. Please contact us with the reference below — do not pay again.",
        });
      }

      resolvedId = String(booking.id);

      // --- Reconcile the amount before confirming --------------------------
      const expectedAmount = Number(booking.total_amount ?? 0);
      const currencyMatches =
        !booking.currency || booking.currency === transaction.currency;

      if (
        expectedAmount > 0 &&
        (Math.abs(paidAmount - expectedAmount) > AMOUNT_TOLERANCE || !currencyMatches)
      ) {
        reconciled = false;
        console.error(
          `[paystack/verify] AMOUNT MISMATCH reference=${reference} ` +
            `expected=${expectedAmount} ${booking.currency} paid=${paidAmount} ${transaction.currency}`,
        );
        // Deliberately do NOT confirm, do NOT block dates, do NOT email a receipt.
        // A human needs to look at this one.
        return NextResponse.json(
          {
            status: transaction.status,
            successful: false,
            reconciled: false,
            needsAttention: true,
            reference: transaction.reference,
            amount: paidAmount,
            currency: transaction.currency,
            paidAt: transaction.paid_at ?? null,
            email: transaction.customer?.email ?? null,
            receiptEmail: null,
            error:
              "The amount paid does not match this reservation, so it has not been confirmed. Please contact us with the reference below — you will not be charged twice.",
          },
          { status: 409 },
        );
      }

      const update = {
        status: "confirmed",
        payment_status: "paid",
        payment_reference: transaction.reference,
        paid_at: transaction.paid_at ?? new Date().toISOString(),
        amount_paid: paidAmount,
        currency: transaction.currency,
      };

      const { error: updateError } = await supabase
        .from("bookings")
        .update(update)
        .eq("id", resolvedId);

      if (updateError) {
        console.warn(
          "[paystack/verify] full update failed, retrying minimal:",
          updateError.message,
        );
        await supabase
          .from("bookings")
          .update({ status: "confirmed" })
          .eq("id", resolvedId);
      }

      // Hold the dates and send the receipt. Doing this here as well as in the
      // webhook matters because the guest reaches this route on every return
      // from Paystack, whereas the webhook may lag behind or — until it is
      // registered in the Paystack dashboard — never arrive at all.
      await blockDatesForBooking(supabase, resolvedId, transaction.reference);
      receiptEmail = await sendReceiptOnce(transaction.reference);
    }

    // A successful charge we cannot record is not a success from the guest's
    // point of view. This is precisely the state production was in while
    // SUPABASE_SERVICE_ROLE_KEY was missing: Paystack said "success", the guest
    // was told their dates were held, and no booking existed.
    if (isSuccessful && !isServiceRoleConfigured()) {
      console.error(
        `[paystack/verify] PAID BUT NOT STORED reference=${reference} — ` +
          "SUPABASE_SERVICE_ROLE_KEY is missing, so the booking cannot be confirmed.",
      );

      return NextResponse.json({
        status: transaction.status,
        successful: false,
        reconciled: false,
        needsAttention: true,
        reference: transaction.reference,
        amount: paidAmount,
        currency: transaction.currency,
        paidAt: transaction.paid_at ?? null,
        email: transaction.customer?.email ?? null,
        receiptEmail: null,
        error:
          "Your payment went through, but we could not save your reservation. Please contact us with the reference below — do not pay again.",
      });
    }

    return NextResponse.json({
      status: transaction.status,
      successful: isSuccessful,
      reconciled,
      reference: transaction.reference,
      amount: paidAmount,
      currency: transaction.currency,
      paidAt: transaction.paid_at ?? null,
      email: transaction.customer?.email ?? null,
      receiptEmail,
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Verification failed.";
    console.error("[paystack/verify]", message);
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
