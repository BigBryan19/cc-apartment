// app/api/payments/paystack/verify/route.ts
// ---------------------------------------------------------------------------
// GET /api/payments/paystack/verify?reference=CC-XXXX
//
// Called by the /checkout/success page when the guest returns from Paystack.
// Webhooks can be delayed, so the callback path confirms the transaction
// directly against Paystack before showing a success state.
// ---------------------------------------------------------------------------

import { NextResponse } from "next/server";
import { isPaystackConfigured, verifyTransaction } from "@/app/lib/paystack";
import {
  createServiceClient,
  isServiceRoleConfigured,
} from "@/app/lib/supabase-server";
import { blockDatesForBooking } from "@/app/lib/booking-holds";
import { sendReceiptOnce } from "@/app/lib/receipt";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
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

    // Everything below is idempotent, so the webhook and this route can both
    // run it without double-charging, double-blocking or double-emailing.
    let receiptEmail: string | null = null;

    // Confirm the booking server-side so a guest who closes the tab before the
    // webhook lands still ends up with a confirmed reservation.
    if (isSuccessful && isServiceRoleConfigured()) {
      const supabase = createServiceClient();
      const metaBookingId = transaction.metadata?.bookingId;

      const update = {
        status: "confirmed",
        payment_status: "paid",
        payment_reference: transaction.reference,
        paid_at: transaction.paid_at ?? new Date().toISOString(),
        amount_paid: transaction.amount / 100,
        currency: transaction.currency,
      };

      let resolvedId: string | null =
        metaBookingId !== undefined &&
        metaBookingId !== null &&
        metaBookingId !== ""
          ? String(metaBookingId)
          : null;

      if (resolvedId) {
        const { error } = await supabase
          .from("bookings")
          .update(update)
          .eq("id", resolvedId);

        if (error) {
          // Payment columns may not exist yet (migration not run).
          await supabase
            .from("bookings")
            .update({ status: "confirmed" })
            .eq("id", resolvedId);
        }
      } else {
        const { data } = await supabase
          .from("bookings")
          .update(update)
          .eq("payment_reference", transaction.reference)
          .select("id");

        resolvedId = data?.[0]?.id ?? null;
      }

      // Hold the dates and send the receipt. Doing this here as well as in the
      // webhook matters because the guest reaches this route on every return
      // from Paystack, whereas the webhook may lag behind or — until it is
      // registered in the Paystack dashboard — never arrive at all.
      if (resolvedId) {
        await blockDatesForBooking(supabase, resolvedId, transaction.reference);
      }
      receiptEmail = await sendReceiptOnce(transaction.reference);
    }

    return NextResponse.json({
      status: transaction.status,
      successful: isSuccessful,
      reference: transaction.reference,
      amount: transaction.amount / 100,
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
