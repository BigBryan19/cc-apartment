// app/lib/dates.ts
// ---------------------------------------------------------------------------
// Central date engine for booking availability.
//
// All helpers work on *local-time* `YYYY-MM-DD` keys. Never use
// `toISOString().split("T")[0]` for this: it converts to UTC first, so a user
// east/west of UTC sees the wrong day (and the wrong set of disabled dates).
// ---------------------------------------------------------------------------

export const MS_PER_DAY = 24 * 60 * 60 * 1000;

/**
 * Month (0-indexed) at which the booking window is allowed to extend past the
 * base "current year + 1" rule. 5 === June.
 * Kept as a named constant so the business rule lives in exactly one place.
 */
export const MID_YEAR_EXTENSION_MONTH = 5;

/** Inclusive date range that is unavailable for booking. */
export interface DateRange {
  /** Row id, present for admin-blocked ranges so they can be deleted. */
  id?: string | number;
  /** `YYYY-MM-DD` */
  start: string;
  /** `YYYY-MM-DD` */
  end: string;
  /** "blocked" (admin) or "booked" (existing reservation). */
  kind?: "blocked" | "booked";
  reason?: string;
  /**
   * For an admin block created by a paid booking, the reservation behind it.
   * Releasing the block has to cancel that booking too, otherwise the booking
   * keeps the dates unavailable on its own.
   */
  bookingId?: string | null;
}

const pad = (n: number): string => (n < 10 ? `0${n}` : `${n}`);

/** Local-time `YYYY-MM-DD` key. */
export function toDateKey(date: Date): string {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

/** Parse a `YYYY-MM-DD` key into a local-midnight Date. */
export function fromDateKey(key: string): Date {
  const [y, m, d] = key.split("-").map(Number);
  return new Date(y, (m || 1) - 1, d || 1);
}

/** Normalise any Date to local midnight. */
export function startOfDay(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

export function todayKey(now: Date = new Date()): string {
  return toDateKey(now);
}

export function addDays(date: Date, days: number): Date {
  const next = new Date(date.getTime());
  next.setDate(next.getDate() + days);
  return next;
}

export function addDaysToKey(key: string, days: number): string {
  return toDateKey(addDays(fromDateKey(key), days));
}

/** True when `key` is a well-formed `YYYY-MM-DD` string. */
export function isValidDateKey(key: string | null | undefined): key is string {
  return !!key && /^\d{4}-\d{2}-\d{2}$/.test(key);
}

/** Whole nights between two keys (check-out exclusive). */
export function nightsBetween(checkInKey: string, checkOutKey: string): number {
  if (!isValidDateKey(checkInKey) || !isValidDateKey(checkOutKey)) return 0;
  const diff = fromDateKey(checkOutKey).getTime() - fromDateKey(checkInKey).getTime();
  return diff > 0 ? Math.round(diff / MS_PER_DAY) : 0;
}

// ---------------------------------------------------------------------------
// Booking window boundaries
// ---------------------------------------------------------------------------

/**
 * Highest calendar year a guest may book into.
 *
 * Rolling window: the current calendar year plus the next one.
 *   • In 2026 this allows bookings through the end of 2027 (2028 blocked).
 *   • Once the calendar itself reaches 2027, 2028 opens automatically.
 *
 * `MID_YEAR_EXTENSION_MONTH` is retained as the single tuning point if the
 * business later wants a wider runway from mid-year onward.
 */
export function getMaxBookableYear(now: Date = new Date()): number {
  const currentYear = now.getFullYear();
  return currentYear + 1;
}

/** Earliest bookable day: today (past dates are never bookable). */
export function getMinBookableDateKey(now: Date = new Date()): string {
  return todayKey(now);
}

/** Latest bookable day: 31 Dec of {@link getMaxBookableYear}. */
export function getMaxBookableDateKey(now: Date = new Date()): string {
  return `${getMaxBookableYear(now)}-12-31`;
}

/** Human-readable summary of the allowed window, for UI hints. */
export function describeBookingWindow(now: Date = new Date()): string {
  const min = getMinBookableDateKey(now);
  const max = getMaxBookableDateKey(now);
  return `Bookings are open from ${min} through ${max}.`;
}

// ---------------------------------------------------------------------------
// Range maths / conflict detection
// ---------------------------------------------------------------------------

/** Expand one inclusive range into its individual day keys. */
export function expandRange(range: DateRange): string[] {
  const keys: string[] = [];
  if (!isValidDateKey(range.start) || !isValidDateKey(range.end)) return keys;
  let cursor = fromDateKey(range.start);
  const end = fromDateKey(range.end);
  // Guard against pathological ranges (e.g. a 100-year span).
  let guard = 0;
  while (cursor.getTime() <= end.getTime() && guard < 3650) {
    keys.push(toDateKey(cursor));
    cursor = addDays(cursor, 1);
    guard += 1;
  }
  return keys;
}

/** Flatten ranges into a lookup Set for O(1) day checks. */
export function buildUnavailableSet(ranges: DateRange[]): Set<string> {
  const set = new Set<string>();
  for (const range of ranges) {
    for (const key of expandRange(range)) set.add(key);
  }
  return set;
}

/**
 * Nights a stay occupies: `[checkIn, checkOut)`.
 * The check-out day itself is free for the next guest's check-in.
 */
export function occupiedNightKeys(checkInKey: string, checkOutKey: string): string[] {
  const nights = nightsBetween(checkInKey, checkOutKey);
  if (nights <= 0) return [];
  const keys: string[] = [];
  let cursor = fromDateKey(checkInKey);
  for (let i = 0; i < nights; i += 1) {
    keys.push(toDateKey(cursor));
    cursor = addDays(cursor, 1);
  }
  return keys;
}

/** Ranges that collide with the stay `[checkIn, checkOut)`. */
export function findConflicts(
  checkInKey: string,
  checkOutKey: string,
  ranges: DateRange[],
): DateRange[] {
  const nights = new Set(occupiedNightKeys(checkInKey, checkOutKey));
  if (nights.size === 0) return [];
  return ranges.filter((range) =>
    expandRange(range).some((key) => nights.has(key)),
  );
}

/** True when the requested stay collides with any blocked/booked range. */
export function isRangeUnavailable(
  checkInKey: string,
  checkOutKey: string,
  ranges: DateRange[],
): boolean {
  return findConflicts(checkInKey, checkOutKey, ranges).length > 0;
}

/**
 * A single day is selectable when it is inside the booking window and not
 * covered by a blocked/booked range.
 */
export function isDayDisabled(
  key: string,
  unavailable: Set<string>,
  minKey: string,
  maxKey: string,
): boolean {
  if (key < minKey) return true;
  if (key > maxKey) return true;
  return unavailable.has(key);
}

/**
 * Validate a stay against the window + unavailable ranges.
 * Returns `null` when the stay is bookable, otherwise a user-facing message.
 */
export function validateStay(
  checkInKey: string,
  checkOutKey: string,
  ranges: DateRange[],
  now: Date = new Date(),
): string | null {
  if (!isValidDateKey(checkInKey) || !isValidDateKey(checkOutKey)) {
    return "Please select both a check-in and a check-out date.";
  }
  if (checkOutKey <= checkInKey) {
    return "Check-out must be after check-in.";
  }

  const minKey = getMinBookableDateKey(now);
  const maxKey = getMaxBookableDateKey(now);

  if (checkInKey < minKey) return "Check-in cannot be in the past.";
  if (checkOutKey > addDaysToKey(maxKey, 1)) {
    return `Bookings are only open through ${maxKey}.`;
  }

  const conflicts = findConflicts(checkInKey, checkOutKey, ranges);
  if (conflicts.length > 0) {
    const first = conflicts[0];
    const label = first.kind === "booked" ? "already booked" : "unavailable";
    return `${first.start} to ${first.end} is ${label}. Please choose different dates.`;
  }

  return null;
}
