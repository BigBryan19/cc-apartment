// app/lib/booking-holds.ts
// ---------------------------------------------------------------------------
// Shared side effects for a booking that has just been paid for.
//
// Both the Paystack webhook and the /verify route need these, and either can be
// the first to observe success — the guest always returns through /checkout/
// success (which calls /verify), while the webhook may lag or, until it is
// registered in the Paystack dashboard, never arrive.
//
// Both operations are idempotent, so running them twice is harmless.
// ---------------------------------------------------------------------------

import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { addDaysToKey } from "./dates";

/**
 * Mirror a paid booking into `blocked_dates`.
 *
 * Guests are already kept off these nights by `useVillaAvailability`, which
 * treats any non-cancelled booking as unavailable. This row is what makes the
 * reservation *visible* in /admin/availability, and therefore revocable.
 *
 * NOTE ON `reason`: `blocked_dates` is world-readable (guests must see which
 * nights are closed before they have an account), so this text must never carry
 * guest details. The link back to the reservation is `booking_id`, which is
 * unreadable without the authenticated policies.
 *
 * Returns a short status string, or null when there was nothing to do.
 */
export async function blockDatesForBooking(
  supabase: SupabaseClient,
  bookingId: string,
  reference: string,
): Promise<string | null> {
  const { data: booking, error: readError } = await supabase
    .from("bookings")
    .select("id, villa_id, check_in_date, check_out_date")
    .eq("id", bookingId)
    .maybeSingle();

  if (readError || !booking?.check_in_date) return null;

  const startDate = String(booking.check_in_date);

  // A stay occupies [check-in, check-out). The checkout day itself stays
  // bookable for the next guest, so the block ends the night before.
  const endDate = booking.check_out_date
    ? addDaysToKey(String(booking.check_out_date), -1)
    : startDate;

  const { error } = await supabase.from("blocked_dates").insert({
    villa_id: booking.villa_id,
    start_date: startDate,
    end_date: endDate,
    reason: "Reserved",
    booking_id: bookingId,
  });

  if (error) {
    // 23505 = the partial unique index caught a redelivery. That is the
    // desired end state, not a failure.
    if (error.code === "23505") {
      return `${startDate}..${endDate} (already blocked)`;
    }
    console.warn(
      `[booking-holds] could not block dates for ${reference}:`,
      error.message,
    );
    return null;
  }

  return `${startDate}..${endDate}`;
}
