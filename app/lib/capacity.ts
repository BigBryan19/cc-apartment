// app/lib/capacity.ts
// ---------------------------------------------------------------------------
// Approved maximum occupancy, per property.
//
// WHY CAPACITY IS DERIVED HERE AND NOT READ FROM THE ROW
//
//   Every property row carried `guests = 4`, including the four-bedroom houses.
//   That single figure was then shown on the listing card, on the property page,
//   in the guest filter and as the whole-apartment rate's maximum — so an
//   eight-guest house refused a party of five at checkout.
//
//   The business rule is stated by bedroom count:
//
//     three-bedroom house  ->  up to 6 guests
//     four-bedroom house   ->  up to 8 guests
//
//   Capacity is therefore a function of the inventory, applied on read, so a
//   stale database column cannot re-introduce the defect. Only the bedroom
//   counts the business has actually ruled on appear below; every other
//   property type keeps whatever capacity is recorded against it, which is why
//   this is a table rather than one default applied everywhere.
//
//   The migration `2026-11-01-capacity-and-media.sql` writes the same figures
//   into `villas.guests`, so the stored data agrees with what the site shows and
//   an owner editing a property sees the real number rather than the old 4.
// ---------------------------------------------------------------------------

/** Bedroom count -> approved maximum guests. Deliberately partial. */
export const APPROVED_CAPACITY_BY_BEDROOMS: Readonly<Record<number, number>> = {
  3: 6,
  4: 8,
};

/**
 * The occupancy a property is allowed to advertise and accept.
 *
 * @param bedrooms  Bedrooms recorded for the property.
 * @param stored    `villas.guests`, used only when no rule covers this
 *                  bedroom count — never silently rewritten to a default.
 */
export function approvedCapacity(
  bedrooms: number | null | undefined,
  stored: number | null | undefined,
): number {
  const rooms = Number(bedrooms);
  const rule = Number.isFinite(rooms) ? APPROVED_CAPACITY_BY_BEDROOMS[rooms] : undefined;
  // A rule exists only where the business stated one. Otherwise the verified
  // per-property figure wins untouched.
  if (typeof rule === "number") return rule;
  const fallback = Number(stored);
  return Number.isFinite(fallback) && fallback > 0 ? fallback : 0;
}

/** True when this bedroom count is governed by the rule above. */
export function capacityIsApprovedByRule(bedrooms: number | null | undefined): boolean {
  const rooms = Number(bedrooms);
  return Number.isFinite(rooms) && typeof APPROVED_CAPACITY_BY_BEDROOMS[rooms] === "number";
}

/** Owner-facing explanation, shown next to the capacity field in admin. */
export function capacityRuleNote(bedrooms: number | null | undefined): string | null {
  const rooms = Number(bedrooms);
  if (!capacityIsApprovedByRule(rooms)) return null;
  const guests = APPROVED_CAPACITY_BY_BEDROOMS[rooms];
  return `A ${rooms}-bedroom house is set to ${guests} guests. This follows from the bedroom count, so it is shown rather than typed.`;
}

/** One line for the completion summary and for the rate audit screen. */
export function describeCapacity(bedrooms: number, guests: number): string {
  return `${bedrooms}-bedroom property, up to ${guests} guests`;
}
