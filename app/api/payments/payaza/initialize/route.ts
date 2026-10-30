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
import { BOOKINGS_TABLE, SETTINGS_TABLE, VILLAS_TABLE } from "@/app/lib/tables";
import { priceRequest, type PriceableVilla } from "@/app/lib/pricing";
import { clientKey, rateLimit } from "@/app/lib/rate-limit";
import {
  balanceDueDateKey,
  isDepositConfigured,
  parseDepositPolicy,
  policyFromEnv,
  resolveDue,
  type DepositPolicy,
} from "@/app/lib/deposit";

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
  /** "full" or "deposit". An input, never a price. */
  paymentPlan?: string;
}

/**
 * The owner's deposit policy: the database row if it exists, otherwise the
 * environment fallback. Never invented — an unreadable policy means no deposit
 * is offered.
 */
async function loadDepositPolicy(
  supabase: ReturnType<typeof createServiceClient>,
): Promise<DepositPolicy> {
  const fallback = policyFromEnv("server");
  try {
    const { data } = await supabase
      .from(SETTINGS_TABLE)
      .select("value")
      .eq("key", "deposit_policy")
      .maybeSingle();
    const parsed = parseDepositPolicy((data as { value?: unknown } | null)?.value);
    return isDepositConfigured(parsed) ? parsed : fallback;
  } catch {
    return fallback;
  }
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

  // --- Payment plan ---------------------------------------------------------
  // The guest chooses *whether* to pay a deposit; the server decides *how much*,
  // from the policy and the total it calculated itself.
  const requestedPlan = body.paymentPlan === "deposit" ? "deposit" : "full";
  const policy = await loadDepositPolicy(supabase);
  const due = resolveDue(quote.total, policy, requestedPlan);

  if (requestedPlan === "deposit" && due.unavailable) {
    return badRequest(
      "Paying a deposit is not available on this booking. Please pay in full, or contact us to arrange it.",
      409,
    );
  }

  const plan: "full" | "deposit" = due.plan === "deposit" && due.deposit > 0 ? "deposit" : "full";
  const balanceDueDate =
    plan === "deposit" ? balanceDueDateKey(checkIn, policy) : null;

  // --- Reuse an in-flight attempt ------------------------------------------
  // A guest who presses "Pay" twice, refreshes the redirect, or retries after a
  // gateway error must not end up with two reservations (and, worse, two
  // charges). An unpaid attempt for the same property, unit, dates and email in
  // the last 30 minutes is updated in place and keeps its reference.
  const reuseSince = new Date(Date.now() - 30 * 60 * 1000).toISOString();
  const { data: existing } = await supabase
    .from(BOOKINGS_TABLE)
    .select("id, payment_reference")
    .eq("villa_id", villaId)
    .eq("guest_email", email)
    .eq("check_in_date", checkIn)
    .eq("check_out_date", checkOut)
    .eq("status", "pending")
    .eq("payment_status", "pending")
    .gte("created_at", reuseSince)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  const reference =
    (existing as { payment_reference?: string } | null)?.payment_reference ??
    generateReference("PZ");

  const bookingFields: Record<string, unknown> = {
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
    due_now: due.dueNow,
    currency,
    payment_method: "payaza",
    payment_reference: reference,
    payment_status: "pending",
    status: "pending",
  };

  // Deposit columns are new. On a database where the migration has not been run
  // yet the insert would fail outright and take bookings down with it, so the
  // deposit fields are written in a second pass and the booking itself is never
  // lost because of them.
  const depositFields: Record<string, unknown> = {
    payment_plan: plan,
    deposit_amount: plan === "deposit" ? due.deposit : 0,
    balance_due: plan === "deposit" ? due.balance : 0,
    balance_due_date: balanceDueDate,
  };

  let bookingId: number | null =
    (existing as { id?: number } | null)?.id ?? null;

  if (bookingId === null) {
    const { data: inserted, error: insertError } = await supabase
      .from(BOOKINGS_TABLE)
      .insert([{ ...bookingFields, ...depositFields }])
      .select("id")
      .single();

    if (insertError || !inserted) {
      // Retry once without the deposit columns (see comment above).
      const retry = await supabase
        .from(BOOKINGS_TABLE)
        .insert([bookingFields])
        .select("id")
        .single();
      if (retry.error || !retry.data) {
        return badRequest("Could not reserve dates.", 503);
      }
      bookingId = retry.data.id;
    } else {
      bookingId = inserted.id;
    }
  } else {
    await supabase.from(BOOKINGS_TABLE).update({ ...bookingFields, ...depositFields }).eq("id", bookingId);
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
    // The amount the gateway charges is the deposit *or* the total, decided
    // above from trusted records — never a figure from the request body.
    checkout_amount: due.dueNow,
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
    bookingId,
    amount: due.dueNow,
    balanceDue: due.balance,
    paymentPlan: plan,
    currency,
  });
}
