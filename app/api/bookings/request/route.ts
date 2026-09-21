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
// The paid path is /api/payments/paystack/initialize, which creates the booking
// the same way.
// ---------------------------------------------------------------------------

import { NextResponse } from "next/server";
import {
  createServiceClient,
  isServiceRoleConfigured,
} from "@/app/lib/supabase-server";
import { validateStay, isValidDateKey, type DateRange } from "@/app/lib/dates";
import { BLOCKED_DATES_TABLE } from "@/app/lib/availability";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

interface RequestBody {
  villaId?: number | string;
  guestName?: string;
  guestEmail?: string;
  guestPhone?: string;
  checkIn?: string;
  checkOut?: string;
  nights?: number;
  rate?: string;
  totalAmount?: number;
  currency?: string;
  packages?: string[];
}

function badRequest(message: string, status = 400) {
  return NextResponse.json(
    { successful: false, error: message },
    { status },
  );
}

export async function POST(request: Request) {
  if (!isServiceRoleConfigured()) {
    return badRequest(
      "Booking storage is not configured on the server.",
      503,
    );
  }

  let body: RequestBody;
  try {
    body = (await request.json()) as RequestBody;
  } catch {
    return badRequest("Invalid JSON body.");
  }

  const email = (body.guestEmail ?? "").trim();
  const checkIn = (body.checkIn ?? "").trim();
  const checkOut = (body.checkOut ?? "").trim();
  const villaId = Number(body.villaId);
  const amount = Number(body.totalAmount);

  if (!email.includes("@")) return badRequest("A valid email address is required.");
  if (!isValidDateKey(checkIn)) return badRequest("A valid check-in date is required.");
  if (!isValidDateKey(checkOut)) return badRequest("A valid check-out date is required.");
  if (Number.isNaN(villaId)) return badRequest("A property is required.");
  if (!Number.isFinite(amount) || amount <= 0)
    return badRequest("A positive amount is required.");

  const supabase = createServiceClient();

  // Re-check availability server-side. The client already does this, but a
  // request that bypasses the UI must not be able to double-book a night.
  try {
    const [blockedResult, bookedResult] = await Promise.all([
      supabase
        .from(BLOCKED_DATES_TABLE)
        .select("start_date, end_date")
        .eq("villa_id", villaId),
      supabase
        .from("bookings")
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
    .from("bookings")
    .insert([
      {
        villa_id: villaId,
        guest_name: (body.guestName ?? "").trim(),
        guest_email: email,
        guest_phone: (body.guestPhone ?? "").trim(),
        check_in_date: checkIn,
        check_out_date: checkOut,
        nights: Number.isFinite(Number(body.nights)) ? Number(body.nights) : null,
        total_amount: amount,
        currency: (body.currency || "GHS").toUpperCase(),
        packages: Array.isArray(body.packages) ? body.packages : [],
        payment_method: "unpaid-request",
        payment_status: "unpaid",
        status: "pending",
      },
    ])
    .select("id");

  if (error) {
    return badRequest(`Could not save the request: ${error.message}`, 500);
  }

  return NextResponse.json({
    successful: true,
    bookingId: data?.[0]?.id ?? null,
  });
}
