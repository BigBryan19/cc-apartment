// app/api/payments/payaza/initialize/route.ts
// ---------------------------------------------------------------------------
// POST /api/payments/payaza/initialize
//
// Creates a booking and returns the Payaza hosted checkout URL.
// ---------------------------------------------------------------------------

import { NextResponse } from "next/server";
import {
  generateReference,
  generateCheckoutUrl,
  isPayazaConfigured,
} from "@/app/lib/payaza";
import {
  createServiceClient,
  isServiceRoleConfigured,
} from "@/app/lib/supabase-server";
import { isValidDateKey, validateStay } from "@/app/lib/dates";
import { BLOCKED_DATES_TABLE, BOOKINGS_TABLE, VILLAS_TABLE } from "@/app/lib/tables";
import { priceRequest, type PriceableVilla } from "@/app/lib/pricing";
import { clientKey, rateLimit } from "@/app/lib/rate-limit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const SUPPORTED_CURRENCIES = ["GHS", "NGN", "USD", "KES", "XOF", "ZAR"];
const MAX_NAME_LENGTH = 120;
const MAX_PHONE_LENGTH = 40;
const RATE_LIMIT = { limit: 5, windowMs: 60_000 };

interface InitializeBody {
  email?: string;
  currency?: string;
  villaId?: number | string;
  unitId?: string;
  packageId?: string;
  extraIds?: unknown;
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
  const limit = rateLimit(clientKey(request, "payaza-init"), RATE_LIMIT.limit, RATE_LIMIT.windowMs);
  if (!limit.ok) {
    return NextResponse.json(
      { error: "Too many attempts. Please wait." },
      { status: 429 },
    );
  }

  if (!isPayazaConfigured()) {
    return badRequest("Payment gateway (Payaza) is not configured.", 503);
  }

  if (!isServiceRoleConfigured()) {
    return badRequest("Storage not configured.", 503);
  }

  let body: InitializeBody;
  try {
    body = await request.json();
  } catch {
    return badRequest("Invalid JSON.");
  }

  const email = cleanText(body.email, 254);
  const currency = (body.currency || "GHS").toUpperCase();
  if (!SUPPORTED_CURRENCIES.includes(currency)) {
    return badRequest(`Unsupported currency: ${currency}`);
  }

  const villaId = Number(body.villaId);
  const checkIn = cleanText(body.checkIn, 10);
  const checkOut = cleanText(body.checkOut, 10);
  const guestName = cleanText(body.guestName, MAX_NAME_LENGTH);
  const guestPhone = cleanText(body.guestPhone, MAX_PHONE_LENGTH);
  const unitId = cleanText(body.unitId, 80) || null;
  const packageId = cleanText(body.packageId, 80) || null;
  const guests = Math.max(1, Math.min(60, Math.floor(Number(body.guests) || 1)));
  const extraIds = Array.isArray(body.extraIds) ? body.extraIds.filter(e => typeof e === "string") : [];

  const supabase = createServiceClient();
  const { data: villaRow } = await supabase.from(VILLAS_TABLE).select("*").eq("id", villaId).maybeSingle();
  if (!villaRow) return badRequest("Property not found.", 404);

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

  if (!pricing.ok) return badRequest(pricing.message, pricing.status);
  const { quote, unit, nights, occasionStatus, packageSnapshot, packageName, packageId: resolvedPackageId } = pricing.priced;

  // Availability check
  const { data: booked } = await supabase.from(BOOKINGS_TABLE).select("check_in_date, check_out_date").eq("villa_id", villaId).neq("status", "cancelled");
  const problem = validateStay(checkIn, checkOut, (booked ?? []).map(b => ({ start: b.check_in_date, end: b.check_out_date, kind: "booked" })));
  if (problem) return badRequest(problem, 409);

  const reference = generateReference("PZ");
  const { data: inserted, error: insertError } = await supabase.from(BOOKINGS_TABLE).insert([
    {
      villa_id: villaId,
      guest_name: guestName,
      guest_email: email,
      guest_phone: guestPhone,
      check_in_date: checkIn,
      check_out_date: checkOut,
      guests,
      nights,
      accommodation_status: "pending_payment",
      occasion_status: occasionStatus,
      accommodation_unit_id: unit.id,
      accommodation_unit_name: unit.name,
      package_id: resolvedPackageId,
      package_name: packageName,
      package_snapshot: packageSnapshot,
      total_amount: quote.total,
      due_now: quote.dueNow,
      currency,
      payment_method: "payaza",
      payment_reference: reference,
      payment_status: "pending",
      status: "pending",
    }
  ]).select("id").single();

  if (insertError || !inserted) {
    return badRequest("Could not reserve dates.", 503);
  }

  const origin = process.env.NEXT_PUBLIC_SITE_URL || new URL(request.url).origin;
  const names = guestName.split(" ");
  const firstName = names[0] || "Guest";
  const lastName = names.slice(1).join(" ") || "Customer";

  const rawMode = process.env.PAYAZA_CONNECTION_MODE?.toLowerCase() || 
                    (process.env.NODE_ENV === "production" ? "live" : "test");
  
  const connectionMode: "Live" | "Test" = rawMode === "live" ? "Live" : "Test";

  console.log(`[payaza/init] mode=${connectionMode} key=${process.env.PAYAZA_MERCHANT_KEY?.slice(0, 7)}...`);

  const authorizationUrl = generateCheckoutUrl({
    merchant_key: process.env.PAYAZA_MERCHANT_KEY!,
    connection_mode: connectionMode,
    checkout_amount: quote.dueNow,
    currency_code: currency,
    email_address: email,
    first_name: firstName,
    last_name: lastName,
    phone_number: guestPhone || "0000000000",
    transaction_reference: reference,
    redirect_url: `${origin}/checkout/success?reference=${reference}`,
  });

  return NextResponse.json({
    status: "success",
    authorizationUrl,
    reference,
    bookingId: inserted.id,
    amount: quote.dueNow,
    currency,
  });
}
