// app/api/payments/payaza/verify/route.ts
// ---------------------------------------------------------------------------
// GET /api/payments/payaza/verify?reference=PZ-XXXX
//
// Called by the /checkout/success page when the guest returns from Payaza.
// Webhooks can be delayed, so the callback path confirms the transaction
// directly against Payaza before showing a success state.
// ---------------------------------------------------------------------------

import { NextResponse } from "next/server";
import { isPayazaConfigured, verifyTransaction } from "@/app/lib/payaza";
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

/** Tolerance in major units. */
const AMOUNT_TOLERANCE = 0.01;

export async function GET(request: Request) {
  const limit = rateLimit(clientKey(request, "verify-payaza"), RATE_LIMIT.limit, RATE_LIMIT.windowMs);
  if (!limit.ok) {
    return NextResponse.json(
      { error: "Too many verification attempts. Please wait a moment." },
      { status: 429, headers: { "Retry-After": String(limit.retryAfter) } },
    );
  }

  if (!isPayazaConfigured()) {
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
    
    if (!transaction || !transaction.success) {
      console.warn(`[payaza/verify] FAILED reference=${reference} message=${transaction?.message}`);
      return NextResponse.json(
        { error: transaction?.message || "Transaction not found or could not be verified." },
        { status: 404 }
      );
    }

    const data = transaction.data;
    const isSuccessful = data.transaction_status === "Completed";
    const paidAmount = data.amount_received;

    let receiptEmail: string | null = null;
    let reconciled = true;
    // Declared here so the response can report them after the block below.
    let isPartial = false;
    let totalAmount = 0;

    if (isSuccessful && isServiceRoleConfigured()) {
      const supabase = createServiceClient();

      // Read the booking first — we need its recorded total to reconcile.
      const { data: booking } = await supabase
        .from("bookings")
        .select("id, total_amount, due_now, payment_plan, balance_due, currency, payment_reference, payment_status")
        .eq("payment_reference", reference)
        .maybeSingle();

      if (!booking) {
        console.error(
          `[payaza/verify] PAID BUT UNMATCHED reference=${reference} amount=${paidAmount} ${data.currency}`,
        );
        return NextResponse.json({
          status: data.transaction_status,
          successful: false,
          reconciled: false,
          needsAttention: true,
          reference: reference,
          amount: paidAmount,
          currency: data.currency,
          error:
            "Your payment went through, but it has not been matched to a reservation yet. Please contact us with the reference below — do not pay again.",
        });
      }

      const resolvedId = String(booking.id);

      // --- Reconcile the amount before confirming --------------------------
      // Against what this booking asked for *today*, not the full stay: a
      // deposit is a legitimate part-payment, and comparing it to the total
      // would flag every deposit as a mismatch.
      const expectedAmount = Number(
        booking.due_now ?? booking.total_amount ?? 0,
      );
      totalAmount = Number(booking.total_amount ?? expectedAmount);
      isPartial = expectedAmount > 0 && totalAmount - expectedAmount > AMOUNT_TOLERANCE;
      const currencyMatches =
        !booking.currency || booking.currency === data.currency;

      if (
        expectedAmount > 0 &&
        (Math.abs(paidAmount - expectedAmount) > AMOUNT_TOLERANCE || !currencyMatches)
      ) {
        reconciled = false;
        console.error(
          `[payaza/verify] AMOUNT MISMATCH reference=${reference} ` +
            `expected=${expectedAmount} ${booking.currency} paid=${paidAmount} ${data.currency}`,
        );
        return NextResponse.json(
          {
            status: data.transaction_status,
            successful: false,
            reconciled: false,
            needsAttention: true,
            reference: reference,
            amount: paidAmount,
            currency: data.currency,
            error:
                "The amount paid does not match what this reservation asked for, so it has not been confirmed. Please contact us with the reference below — you will not be charged twice.",
          },
          { status: 409 },
        );
      }

      // Booking confirmation and payment status are two different facts:
      // the dates are held and confirmed, but only the deposit has been paid.
      const update: Record<string, unknown> = {
        status: "confirmed",
        payment_status: isPartial ? "partially_paid" : "paid",
        balance_due: isPartial
          ? Math.round((totalAmount - paidAmount) * 100) / 100
          : 0,
        paid_at: new Date().toISOString(),
        amount_paid: paidAmount,
        currency: data.currency,
      };

      const { error: updateError } = await supabase
        .from("bookings")
        .update(update)
        .eq("id", resolvedId);

      if (updateError) {
        console.warn(
          "[payaza/verify] full update failed, retrying minimal:",
          updateError.message,
        );
        await supabase
          .from("bookings")
          .update({ status: "confirmed" })
          .eq("id", resolvedId);
      }

      await blockDatesForBooking(supabase, resolvedId, reference);
      receiptEmail = await sendReceiptOnce(reference);
    }

    if (isSuccessful && !isServiceRoleConfigured()) {
      console.error(
        `[payaza/verify] PAID BUT NOT STORED reference=${reference} — ` +
          "SUPABASE_SERVICE_ROLE_KEY is missing.",
      );

      return NextResponse.json({
        status: data.transaction_status,
        successful: false,
        reconciled: false,
        needsAttention: true,
        reference: reference,
        amount: paidAmount,
        currency: data.currency,
        error:
          "Your payment went through, but we could not save your reservation. Please contact us with the reference below — do not pay again.",
      });
    }

    return NextResponse.json({
      status: data.transaction_status,
      successful: isSuccessful,
      reconciled,
      reference: reference,
      amount: paidAmount,
      currency: data.currency,
      paymentStatus: isPartial ? "partially_paid" : "paid",
      balanceDue: isPartial ? Math.round((totalAmount - paidAmount) * 100) / 100 : 0,
      receiptEmail,
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Verification failed.";
    console.error("[payaza/verify]", message);
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
