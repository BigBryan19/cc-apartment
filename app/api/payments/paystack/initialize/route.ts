// app/api/payments/paystack/initialize/route.ts
// ---------------------------------------------------------------------------
// POST /api/payments/paystack/initialize
//
// Creates a Paystack transaction for a booking and returns the hosted
// checkout URL the browser should be redirected to.
//
// Body:
//   { email, villaId, checkIn, checkOut, rate?, packages?,
//     guestName?, guestPhone?, currency? }
//
// NOTE: there is deliberately no `amount` and no `nights` field. Both are
// computed here from the property row and the two date keys — see
// app/lib/pricing.ts. Anything the client sends for those two names is
// ignored, so a crafted request cannot influence the charge.
//
// ORDER OF OPERATIONS MATTERS
//   The booking row is written BEFORE the Paystack transaction is created, and
//   the transaction is only created if that write succeeded. The previous
//   version did the opposite and swallowed the failure, which is how a guest
//   could be charged for a reservation that was never recorded.
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
// From tables.ts, NOT from lib/availability — that module is "use client" and
// would hand this route handler a client reference instead of the table name,
// making the guard below throw on every call. See app/lib/tables.ts.
import { BLOCKED_DATES_TABLE, BOOKINGS_TABLE, VILLAS_TABLE } from "@/app/lib/tables";
import { priceRequest, type PriceableVilla } from "@/app/lib/pricing";
import { clientKey, rateLimit } from "@/app/lib/rate-limit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const SUPPORTED_CURRENCIES: PaystackCurrency[] = ["GHS", "NGN", "USD", "ZAR", "KES"];

/** Keep unvalidated free-text fields from being used as a storage amplifier. */
const MAX_NAME_LENGTH = 120;
const MAX_PHONE_LENGTH = 40;

/** 5 attempts per IP per minute. Checkout is a considered action, not a loop. */
const RATE_LIMIT = { limit: 5, windowMs: 60_000 };

interface InitializeBody {
  email?: string;
  currency?: string;
  villaId?: number | string;
  /** Identifies the accommodation unit. Never a price. */
  unitId?: string;
  /** Identifies an occasion package. Never a price. */
  packageId?: string;
  /** Identifies extras. Never prices. */
  extraIds?: unknown;
  /** Overnight occupancy. */
  guests?: number | string;
  checkIn?: string;
  checkOut?: string;
  guestName?: string;
  guestPhone?: string;
}

function badRequest(message: string, status = 400) {
  return NextResponse.json({ error: message }, { status });
}

function cleanText(value: unknown, maxLength: number): string {
  return typeof value === "string" ? value.trim().slice(0, maxLength) : "";
}

export async function POST(request: Request) {
  // --- Throttle ------------------------------------------------------------
  const limit = rateLimit(clientKey(request, "initialize"), RATE_LIMIT.limit, RATE_LIMIT.windowMs);
  if (!limit.ok) {
    return NextResponse.json(
      { error: "Too many payment attempts. Please wait a moment and try again." },
      { status: 429, headers: { "Retry-After": String(limit.retryAfter) } },
    );
  }

  if (!isPaystackConfigured()) {
    return badRequest(
      "Payment gateway is not configured. Set PAYSTACK_SECRET_KEY on the server.",
      503,
    );
  }

  // Fail closed. Without the service-role key we cannot record the reservation,
  // and taking money for a booking we cannot store is worse than not selling.
  if (!isServiceRoleConfigured()) {
    console.error(
      "[paystack/initialize] SUPABASE_SERVICE_ROLE_KEY missing — refusing to charge.",
    );
    return badRequest(
      "We cannot take your reservation right now. No payment has been taken — please try again shortly or contact us.",
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
  const email = cleanText(body.email, 254);
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return badRequest("A valid guest email address is required.");
  }

  const currency = ((body.currency || "GHS") as string).toUpperCase() as PaystackCurrency;
  if (!SUPPORTED_CURRENCIES.includes(currency)) {
    return badRequest(`Unsupported currency: ${currency}`);
  }

  const villaId = Number(body.villaId);
  if (!Number.isInteger(villaId) || villaId <= 0) {
    return badRequest("A valid property is required.");
  }

  const checkIn = cleanText(body.checkIn, 10);
  const checkOut = cleanText(body.checkOut, 10);
  if (!isValidDateKey(checkIn) || !isValidDateKey(checkOut)) {
    return badRequest("checkIn and checkOut must be YYYY-MM-DD dates.");
  }

  const guestName = cleanText(body.guestName, MAX_NAME_LENGTH);
  const guestPhone = cleanText(body.guestPhone, MAX_PHONE_LENGTH);
  const unitId = cleanText(body.unitId, 80) || null;
  const packageId = cleanText(body.packageId, 80) || null;
  const guests = Math.max(1, Math.min(60, Math.floor(Number(body.guests) || 1)));
  const extraIds = Array.isArray(body.extraIds)
    ? body.extraIds.filter((entry): entry is string => typeof entry === "string").slice(0, 20)
    : [];

  const supabase = createServiceClient();

  // --- Load the property and price the stay server-side -------------------
  const { data: villaRow, error: villaError } = await supabase
    .from(VILLAS_TABLE)
    .select("id, title, price, rates")
    .eq("id", villaId)
    .maybeSingle();

  if (villaError) {
    console.error("[paystack/initialize] could not read villa:", villaError.message);
    return badRequest("We could not load this property. Please try again.", 503);
  }

  if (!villaRow) {
    return badRequest("That property could not be found.", 404);
  }

  // The server resolves the unit, the package and the extras from records it
  // trusts, then prices them. Nothing money-shaped is read from the request.
  const pricing = priceRequest({
    villa: villaRow as unknown as PriceableVilla,
    unitId,
    checkIn,
    checkOut,
    guests,
    packageId,
    extraIds,
    currency,
  });

  if (!pricing.ok) {
    return badRequest(pricing.message, pricing.status);
  }

  const {
    quote,
    unit,
    nights,
    occasionStatus,
    packageSnapshot,
    packageId: resolvedPackageId,
    packageName,
  } = pricing.priced;

  // --- Availability guard (server-side double-booking protection) ---------
  try {
    const [blockedResult, bookedResult] = await Promise.all([
      supabase
        .from(BLOCKED_DATES_TABLE)
        .select("start_date, end_date")
        .eq("villa_id", villaId),
      supabase
        .from(BOOKINGS_TABLE)
        .select("check_in_date, check_out_date")
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
    console.warn("[paystack/initialize] availability check skipped:", error);
  }

  // --- Persist the pending booking (server-authoritative) -----------------
  // No "retry with a minimal column set" fallback here on purpose. That
  // fallback dropped `payment_reference`, which is the key the webhook, the
  // verify route and the receipt email all look the booking up by — so a
  // booking created through it could be paid for and still never produce a
  // receipt. Failing loudly is the correct behaviour.
  const reference = generateReference();

  const { data: inserted, error: insertError } = await supabase
    .from(BOOKINGS_TABLE)
    .insert([
      {
        villa_id: villaId,
        guest_name: guestName,
        guest_email: email,
        guest_phone: guestPhone,
        check_in_date: checkIn,
        check_out_date: checkOut,
        guests,
        nights,
        // The two independent tracks. A paid room must not set the occasion to
        // confirmed — see app/lib/status.ts.
        accommodation_status: "pending_payment",
        occasion_status: occasionStatus,
        accommodation_unit_id: unit.id,
        accommodation_unit_name: unit.name,
        package_id: resolvedPackageId,
        package_name: packageName,
        package_snapshot: packageSnapshot,
        // Itemised, so the receipt and the admin view can show the composition
        // rather than one opaque total.
        accommodation_subtotal: quote.accommodationSubtotal,
        package_subtotal: quote.packageSubtotal,
        extras_subtotal: quote.extrasSubtotal,
        fees_subtotal: quote.feesSubtotal,
        discount_total: quote.discountTotal,
        refundable_deposit: quote.refundableDeposit,
        total_amount: quote.total,
        due_now: quote.dueNow,
        balance_due: quote.balanceDue,
        balance_due_date: quote.balanceDueDate,
        unpriced_items: quote.unpricedItems,
        currency,
        payment_method: "paystack",
        payment_reference: reference,
        payment_status: "pending",
        extras: extraIds,
        status: "pending",
      },
    ])
    .select("id")
    .single();

  if (insertError || !inserted?.id) {
    console.error(
      "[paystack/initialize] could not persist booking — aborting before charge:",
      insertError?.message,
    );
    // The guest has not been charged: no Paystack transaction exists yet.
    return badRequest(
      "We could not reserve your dates, so no payment has been taken. Please try again or contact us.",
      503,
    );
  }

  const bookingId = inserted.id as string | number;

  // --- Create the Paystack transaction ------------------------------------
  const origin =
    process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "") ||
    new URL(request.url).origin;

  try {
    const result = await initializeTransaction({
      email,
      // The only amount that may ever reach the gateway. `dueNow` equals `total`
      // while no part-payment schedule is configured.
      amount: quote.dueNow,
      currency,
      reference,
      callbackUrl: `${origin}/checkout/success?reference=${encodeURIComponent(reference)}`,
      metadata: {
        bookingId,
        reference,
        villaId,
        villaTitle: unit.kind === "whole_property" ? (villaRow.title ?? null) : (villaRow.title ?? null),
        unitId: unit.id,
        unitName: unit.name,
        packageId: resolvedPackageId,
        occasionStatus,
        checkIn,
        checkOut,
        nights,
        guests,
        extraIds,
      },
      channels: ["card", "mobile_money", "bank", "bank_transfer", "ussd"],
    });

    return NextResponse.json({
      status: "success",
      reference: result.reference,
      accessCode: result.access_code,
      authorizationUrl: result.authorization_url,
      bookingId,
      // Echoed so the UI can show the authoritative figure rather than the one
      // it calculated locally.
      amount: quote.dueNow,
      total: quote.total,
      nights,
      unitName: unit.name,
      // True when something on this booking still needs a quote. The UI must say
      // so before payment rather than implying the total covers everything.
      hasUnpricedItems: quote.unpricedItems.length > 0,
      unpricedItems: quote.unpricedItems,
      occasionStatus,
      currency,
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Could not initialize payment.";

    // Roll back the orphaned pending booking so the dates stay bookable.
    try {
      await supabase.from(BOOKINGS_TABLE).delete().eq("id", bookingId);
    } catch (cleanupError) {
      console.warn("[paystack/initialize] rollback failed:", cleanupError);
    }

    console.error("[paystack/initialize] Paystack error:", message);
    return badRequest(message, 502);
  }
}
