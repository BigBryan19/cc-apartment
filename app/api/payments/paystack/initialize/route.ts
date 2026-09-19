// app/api/payments/paystack/initialize/route.ts
// ---------------------------------------------------------------------------
// POST /api/payments/paystack/initialize
//
// Creates a Paystack transaction for a booking and returns the hosted
// checkout URL the browser should be redirected to.
//
// Body:
//   { email, amount, currency, villaId, villaTitle, checkIn, checkOut,
//     nights, packages?, guestName?, guestPhone?, rate? }
// ---------------------------------------------------------------------------

import { NextResponse } from "next/server";
import {
  generateReference,
  initializeTransaction,
  isPaystackConfigured,
  type PaystackCurrency,
} from "@/app/lib/paystack";
import {
  createServiceClient,
  isServiceRoleConfigured,
} from "@/app/lib/supabase-server";
import { isValidDateKey, validateStay } from "@/app/lib/dates";
import { BLOCKED_DATES_TABLE } from "@/app/lib/availability";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const SUPPORTED_CURRENCIES: PaystackCurrency[] = ["GHS", "NGN", "USD", "ZAR", "KES"];
const MAX_AMOUNT = 10_000_000;

interface InitializeBody {
  email?: string;
  amount?: number | string;
  currency?: string;
  villaId?: number | string;
  villaTitle?: string;
  rate?: string;
  checkIn?: string;
  checkOut?: string;
  nights?: number | string;
  packages?: string[];
  guestName?: string;
  guestPhone?: string;
}

function badRequest(message: string, status = 400) {
  return NextResponse.json({ error: message }, { status });
}

export async function POST(request: Request) {
  if (!isPaystackConfigured()) {
    return badRequest(
      "Payment gateway is not configured. Set PAYSTACK_SECRET_KEY on the server.",
      503,
    );
  }

  let body: InitializeBody;
  try {
    body = (await request.json()) as InitializeBody;
  } catch {
    return badRequest("Invalid JSON body.");
  }

  // --- Validation ---------------------------------------------------------
  const email = (body.email || "").trim();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return badRequest("A valid guest email address is required.");
  }

  const rawAmount = Number(body.amount);
  if (!Number.isFinite(rawAmount) || rawAmount <= 0) {
    return badRequest("A positive payment amount is required.");
  }
  if (rawAmount > MAX_AMOUNT) {
    return badRequest("Payment amount exceeds the permitted maximum.");
  }

  const currency = (body.currency || "GHS").toUpperCase() as PaystackCurrency;
  if (!SUPPORTED_CURRENCIES.includes(currency)) {
    return badRequest(`Unsupported currency: ${currency}`);
  }

  const villaId =
    body.villaId === undefined || body.villaId === null
      ? null
      : Number(body.villaId);

  const checkIn = (body.checkIn || "").trim();
  const checkOut = (body.checkOut || "").trim();
  if (!isValidDateKey(checkIn) || !isValidDateKey(checkOut)) {
    return badRequest("checkIn and checkOut must be YYYY-MM-DD dates.");
  }

  const nights = Number(body.nights) || 0;

  // --- Availability guard (server-side double-booking protection) ---------
  // Only possible with the service-role key; the client-side calendar already
  // hides these dates, this is defence in depth.
  if (isServiceRoleConfigured() && villaId !== null && !Number.isNaN(villaId)) {
    try {
      const supabase = createServiceClient();
      const [blockedResult, bookedResult] = await Promise.all([
        supabase
          .from(BLOCKED_DATES_TABLE)
          .select("start_date, end_date, reason")
          .eq("villa_id", villaId),
        supabase
          .from("bookings")
          .select("check_in_date, check_out_date, status")
          .eq("villa_id", villaId)
          .neq("status", "cancelled"),
      ]);

      const ranges = [
        ...(blockedResult.data ?? []).map((row) => ({
          start: row.start_date as string,
          end: row.end_date as string,
          kind: "blocked" as const,
        })),
        ...(bookedResult.data ?? [])
          .filter((row) => row.check_in_date)
          .map((row) => ({
            start: row.check_in_date as string,
            end: (row.check_out_date as string) || (row.check_in_date as string),
            kind: "booked" as const,
          })),
      ];

      const problem = validateStay(checkIn, checkOut, ranges);
      if (problem) return badRequest(problem, 409);
    } catch (error) {
      // A missing table or transient DB error must not block a sale.
      console.warn("[paystack/initialize] availability check skipped:", error);
    }
  }

  // --- Persist the pending booking (server-authoritative) -----------------
  const reference = generateReference();
  let bookingId: string | number | null = null;

  if (isServiceRoleConfigured()) {
    try {
      const supabase = createServiceClient();
      const { data, error } = await supabase
        .from("bookings")
        .insert([
          {
            villa_id: villaId,
            guest_name: body.guestName ?? "",
            guest_email: email,
            guest_phone: body.guestPhone ?? "",
            check_in_date: checkIn,
            check_out_date: checkOut,
            nights: nights || null,
            total_amount: rawAmount,
            currency,
            payment_method: "paystack",
            payment_reference: reference,
            payment_status: "pending",
            packages: body.packages ?? [],
            status: "pending",
          },
        ])
        .select("id")
        .single();

      if (error) {
        // Likely the migration has not added the new columns yet — retry with
        // the minimal column set so checkout still works end to end.
        console.warn(
          "[paystack/initialize] full booking insert failed, retrying minimal:",
          error.message,
        );
        const fallback = await supabase
          .from("bookings")
          .insert([
            {
              villa_id: villaId,
              guest_name: body.guestName ?? "",
              guest_email: email,
              guest_phone: body.guestPhone ?? "",
              check_in_date: checkIn,
              total_amount: rawAmount,
              payment_method: "paystack",
              status: "pending",
            },
          ])
          .select("id")
          .single();

        if (fallback.error) {
          console.error(
            "[paystack/initialize] could not persist booking:",
            fallback.error.message,
          );
        } else {
          bookingId = fallback.data?.id ?? null;
        }
      } else {
        bookingId = data?.id ?? null;
      }
    } catch (error) {
      console.error("[paystack/initialize] booking insert threw:", error);
    }
  }

  // --- Create the Paystack transaction ------------------------------------
  const origin =
    process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "") ||
    new URL(request.url).origin;

  try {
    const result = await initializeTransaction({
      email,
      amount: rawAmount,
      currency,
      reference,
      callbackUrl: `${origin}/checkout/success?reference=${encodeURIComponent(reference)}`,
      metadata: {
        bookingId,
        reference,
        villaId,
        villaTitle: body.villaTitle ?? null,
        rate: body.rate ?? null,
        checkIn,
        checkOut,
        nights,
        packages: body.packages ?? [],
      },
      channels: ["card", "mobile_money", "bank", "bank_transfer", "ussd"],
    });

    return NextResponse.json({
      status: "success",
      reference: result.reference,
      accessCode: result.access_code,
      authorizationUrl: result.authorization_url,
      bookingId,
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Could not initialize payment.";

    // Roll back the orphaned pending booking so the dates stay bookable.
    if (bookingId !== null && isServiceRoleConfigured()) {
      try {
        await createServiceClient().from("bookings").delete().eq("id", bookingId);
      } catch (cleanupError) {
        console.warn("[paystack/initialize] rollback failed:", cleanupError);
      }
    }

    console.error("[paystack/initialize] Paystack error:", message);
    return badRequest(message, 502);
  }
}
