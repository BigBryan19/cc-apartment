// app/api/payments/payaza/webhook/route.ts
// ---------------------------------------------------------------------------
// POST /api/payments/payaza/webhook
// ---------------------------------------------------------------------------

import { NextResponse } from "next/server";
import { verifyWebhookSignature, type PayazaWebhookEvent } from "@/app/lib/payaza";
import { createServiceClient, isServiceRoleConfigured } from "@/app/lib/supabase-server";
import { blockDatesForBooking } from "@/app/lib/booking-holds";
import { sendReceiptOnce } from "@/app/lib/receipt";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const AMOUNT_TOLERANCE = 0.01;

export async function POST(request: Request) {
  const rawBody = await request.text();
  const signature = request.headers.get("x-payaza-signature");

  if (!verifyWebhookSignature(rawBody, signature)) {
    console.warn("[payaza/webhook] rejected: invalid signature");
    return NextResponse.json({ error: "Invalid signature." }, { status: 401 });
  }

  let event: PayazaWebhookEvent;
  try {
    event = JSON.parse(rawBody);
  } catch {
    return NextResponse.json({ error: "Invalid JSON." }, { status: 400 });
  }

  // Payaza event: Funds Received
  if (event.transaction_status !== "Funds Received") {
    return NextResponse.json({ received: true, ignored: event.transaction_status });
  }

  const reference = event.transaction_reference;
  const amount = event.amount_received;
  const currency = event.currency_code;

  if (!isServiceRoleConfigured()) {
    console.error(`[payaza/webhook] STORAGE MISSING. Paid ref=${reference}`);
    return NextResponse.json({ error: "Server storage not configured." }, { status: 503 });
  }

  const supabase = createServiceClient();

  try {
    // Payaza returns the reference we gave it in transaction_reference or merchant_reference
    // In our initialize, we set both to the same CC/PZ reference.
    const lookupRef = event.merchant_reference || reference;
    
    const { data: booking, error: lookupError } = await supabase
      .from("bookings")
      .select("id, total_amount, currency")
      .eq("payment_reference", lookupRef)
      .maybeSingle();

    if (lookupError || !booking) {
      console.error(`[payaza/webhook] UNMATCHED ref=${lookupRef} amount=${amount}`);
      return NextResponse.json({ received: true, matched: false });
    }

    const expectedAmount = Number(booking.total_amount ?? 0);
    if (Math.abs(amount - expectedAmount) > AMOUNT_TOLERANCE) {
      console.error(`[payaza/webhook] AMOUNT MISMATCH ref=${lookupRef} expected=${expectedAmount} paid=${amount}`);
      return NextResponse.json({ received: true, confirmed: false });
    }

    const { error: updateError } = await supabase
      .from("bookings")
      .update({
        status: "confirmed",
        payment_status: "paid",
        paid_at: new Date().toISOString(),
        amount_paid: amount,
        currency: currency,
      })
      .eq("id", booking.id);

    if (updateError) throw updateError;

    await blockDatesForBooking(supabase, String(booking.id), lookupRef);
    await sendReceiptOnce(lookupRef);

    return NextResponse.json({ received: true, confirmed: true });
  } catch (error) {
    console.error("[payaza/webhook] error:", error);
    return NextResponse.json({ error: "Internal error." }, { status: 500 });
  }
}
