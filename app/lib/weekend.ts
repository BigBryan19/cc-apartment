// app/lib/weekend.ts
// ---------------------------------------------------------------------------
// Weekend restrictions.
//
// THE RULE (set by the business)
//
//   At Adenta Serenity only the entire four-bedroom house can be reserved for a
//   stay that includes a weekend night. The one- and two-bedroom options are
//   weeknight-only. A stay that *starts* on a weekday but reaches into a Friday
//   or Saturday night is still a weekend stay, so the check runs over every
//   night the guest would sleep there, not just the arrival date.
//
// WHICH NIGHTS COUNT AS WEEKEND — NEEDS CONFIRMATION
//
//   The project had no configured definition of a weekend night. Rather than
//   bury a guess inside the check, the definition lives in one constant below
//   and is reported to the owner as unconfirmed. Changing it changes the
//   restriction everywhere, with no other edit.
//
//   Default: Friday and Saturday nights (JavaScript's 5 and 6). Sunday night is
//   treated as a weeknight.
// ---------------------------------------------------------------------------

import { occupiedNightKeys } from "./dates";
import type { AccommodationUnit } from "./rates";

/** JS getDay() values that count as a weekend night. UNCONFIRMED. */
export const WEEKEND_NIGHT_DAYS: readonly number[] = [5, 6];

/** Shown wherever a partial-house booking is refused. */
export const WEEKEND_RESTRICTION_MESSAGE =
  "Weekend bookings are available for the entire house only.";

/** Properties that restrict partial-house bookings at weekends. */
export const WEEKEND_RESTRICTED_PROPERTY_IDS: readonly number[] = [3]; // Adenta

/** True when this calendar night (a date key) falls on a weekend night. */
export function isWeekendNight(dateKey: string): boolean {
  const parts = dateKey.split("-").map(Number);
  if (parts.length !== 3 || parts.some((value) => Number.isNaN(value))) return false;
  const [year, month, day] = parts;
  // Construct in UTC so the machine's zone cannot shift the weekday.
  const weekday = new Date(Date.UTC(year, month - 1, day)).getUTCDay();
  return WEEKEND_NIGHT_DAYS.includes(weekday);
}

/**
 * Every night in `[checkIn, checkOut)` — the nights a guest actually sleeps
 * there. A Saturday check-out is not a Saturday night.
 */
export function stayNights(checkIn: string, checkOut: string): string[] {
  if (!checkIn || !checkOut) return [];
  // `occupiedNightKeys` already yields exactly the nights slept in the range.
  return occupiedNightKeys(checkIn, checkOut);
}

export function stayIncludesWeekendNight(checkIn: string, checkOut: string): boolean {
  return stayNights(checkIn, checkOut).some(isWeekendNight);
}

/**
 * Whether this unit may be booked for these dates.
 *
 * Whole-house units are always allowed. Partial-house units are refused when the
 * stay touches a weekend night at a restricted property.
 */
export function weekendAllowsUnit(
  villaId: number,
  unit: Pick<AccommodationUnit, "kind">,
  checkIn: string,
  checkOut: string,
): boolean {
  if (!WEEKEND_RESTRICTED_PROPERTY_IDS.includes(villaId)) return true;
  if (unit.kind === "whole_property") return true;
  if (!checkIn || !checkOut) return true;
  return !stayIncludesWeekendNight(checkIn, checkOut);
}
