// app/api/bookings/request/route.ts
// ---------------------------------------------------------------------------
// POST /api/bookings/request
//
// Records a booking request WITHOUT taking payment. Used only when the Paystack
// secret key is absent, so the site stays usable before payments are wired up.
//
// Why this is a server route rather than a direct insert from the browser:
//
//   `bookings` holds guest contact details, so its policies are closed to the
//   anonymous role. The checkout used to insert straight from the client with
//   the publishable key, which row-level security rejects — the booking
//   silently disappeared. Doing it here with the service-role key keeps the
//   table closed to anonymous writers, which is also what stops anyone filling
//   it with junk rows.
//
//   Because this route writes with a key that bypasses RLS entirely, it is also
//   the one place a client could previously write an arbitrary `total_amount`
//   into the admin's booking list. Price and nights are now derived from the
//   property row, exactly as the paid path does — see app/lib/pricing.ts.
//
// The paid path is /api/payments/paystack/initialize, which creates the booking
// the same way.
// ---------------------------------------------------------------------------

import { NextResponse } from "next/server";
import {
  createServiceClient,
  isServiceRoleConfigured,
} from "@/app/lib/supabase-server";
import { validateStay, isValidDateKey, type DateRange } from "@/app/lib/dates";
// From tables.ts, NOT from lib/availability — that module is "use client" and
// would hand this route handler a client reference instead of the table name,
// making the guard below throw on every call. See app/lib/tables.ts.
import { BLOCKED_DATES_TABLE, BOOKINGS_TABLE, VILLAS_TABLE } from "@/app/lib/tables";
import { quoteStay, type PriceableVilla } from "@/app/lib/pricing";
import { clientKey, rateLimit } from "@/app/lib/rate-limit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MAX_NAME_LENGTH = 120;
const MAX_PHONE_LENGTH = 40;
const MAX_PACKAGES = 20;
const MAX_PACKAGE_LENGTH = 80;

/** 5 requests per IP per minute. */
const RATE_LIMIT = { limit: 5, windowMs: 60_000 };

interface RequestBody {
  villaId?: number | string;
  guestName?: string;
  guestEmail?: string;
  guestPhone?: string;
  checkIn?: string;
  checkOut?: string;
  rate?: string;
  currency?: string;
  packages?: unknown;
}

function badRequest(message: string, status = 400) {
  return NextResponse.json({ successful: false, error: message }, { status });
}

function cleanText(value: unknown, maxLength: number): string {
  return typeof value === "string" ? value.trim().slice(0, maxLength) : "";
}

export async function POST(request: Request) {
  const limit = rateLimit(clientKey(request, "booking-request"), RATE_LIMIT.limit, RATE_LIMIT.windowMs);
  if (!limit.ok) {
    return NextResponse.json(
      { successful: false, error: "Too many requests. Please wait a moment and try again." },
      { status: 429, headers: { "Retry-After": String(limit.retryAfter) } },
    );
  }

  if (!isServiceRoleConfigured()) {
    return badRequest("Booking storage is not configured on the server.", 503);
  }

  let body: RequestBody;
  try {
    body = (await request.json()) as RequestBody;
  } catch {
    return badRequest("Invalid JSON body.");
  }

  const email = cleanText(body.guestEmail, 254);
  const checkIn = cleanText(body.checkIn, 10);
  const checkOut = cleanText(body.checkOut, 10);
  const guestName = cleanText(body.guestName, MAX_NAME_LENGTH);
  const guestPhone = cleanText(body.guestPhone, MAX_PHONE_LENGTH);
  const requestedRate = cleanText(body.rate, 80) || null;
  const villaId = Number(body.villaId);

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return badRequest("A valid email address is required.");
  }
  if (!isValidDateKey(checkIn)) return badRequest("A valid check-in date is required.");
  if (!isValidDateKey(checkOut)) return badRequest("A valid check-out date is required.");
  if (!Number.isInteger(villaId) || villaId <= 0) {
    return badRequest("A valid property is required.");
  }

  const packages = Array.isArray(body.packages)
    ? body.packages
        .filter((entry): entry is string => typeof entry === "string")
        .map((entry) => entry.trim().slice(0, MAX_PACKAGE_LENGTH))
        .filter(Boolean)
        .slice(0, MAX_PACKAGES)
    : [];

  const supabase = createServiceClient();

  // --- Price the stay from the database, not from the request body --------
  const { data: villaRow, error: villaError } = await supabase
    .from(VILLAS_TABLE)
    .select("id, title, price, rates")
    .eq("id", villaId)
    .maybeSingle();

  if (villaError) {
    console.error("[bookings/request] could not read villa:", villaError.message);
    return badRequest("We could not load this property. Please try again.", 503);
  }
  if (!villaRow) return badRequest("That property could not be found.", 404);

  const pricing = quoteStay(
    villaRow as unknown as PriceableVilla,
    checkIn,
    checkOut,
    requestedRate,
  );
  if (!pricing.ok) return badRequest(pricing.message, pricing.status);

  const quote = pricing.quote;

  // Re-check availability server-side. The client already does this, but a
  // request that bypasses the UI must not be able to double-book a night.
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

    if (!blockedResult.error && !bookedResult.error) {
      const ranges: DateRange[] = [
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
    }
  } catch {
    // Availability could not be checked — fall through and still record the
    // request rather than lose the guest entirely.
  }

  const { data, error } = await supabase
    .from(BOOKINGS_TABLE)
    .insert([
      {
        villa_id: villaId,
        guest_name: guestName,
        guest_email: email,
        guest_phone: guestPhone,
        check_in_date: checkIn,
        check_out_date: checkOut,
        nights: quote.nights,
        total_amount: quote.total,
        currency: ((body.currency || "GHS") as string).toUpperCase().slice(0, 3),
        packages,
        payment_method: "unpaid-request",
        payment_status: "unpaid",
        status: "pending",
      },
    ])
    .select("id");

  if (error) {
    // Log the detail; do not hand a raw Postgres error to the browser — it can
    // name tables, columns and constraints.
    console.error("[bookings/request] insert failed:", error.message);
    return badRequest("Could not save your request. Please try again or contact us.", 500);
  }

  return NextResponse.json({
    successful: true,
    bookingId: data?.[0]?.id ?? null,
    amount: quote.total,
    nights: quote.nights,
  });
}
