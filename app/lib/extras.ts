// app/lib/extras.ts
// ---------------------------------------------------------------------------
// Optional extras that can be attached to a stay.
//
// EVERY EXTRA HERE IS UNPRICED, ON PURPOSE
//
//   The three add-ons the checkout previously offered — Honeymoon Setup,
//   Birthday Decoration and Luxury Car Rental — have no approved prices anywhere
//   in the repository, the database or the brief. The buy-flow consequence was
//   the reported defect: they appeared in the order summary, showed
//   "Quote pending", contributed nothing to the total, and then the booking was
//   marked fully confirmed anyway.
//
//   Inventing a figure for "Honeymoon Setup" would put a price commitment in
//   front of a guest that nobody at Cosy Crest has agreed. So each extra is
//   marked `requiresQuote: true` with `amount: null`. The pricing engine then
//   lists it as an explicit unpriced line, excludes it from the payable amount,
//   and the occasion track stays `requested` rather than `confirmed`.
//
//   Car rental is kept as an optional extra rather than elevated to a fourth
//   occasion category — the brief reserves the three categories for honeymoon,
//   birthday and private gatherings.
//
//   An admin sets `amount` and flips `requiresQuote` to false to make an extra
//   instantly bookable. Nothing else needs to change.
// ---------------------------------------------------------------------------

import type { PriceBasis } from "./rates";

export interface ExtraDefinition {
  id: string;
  name: string;
  summary: string;
  /** Major units, or null when not approved for sale. */
  amount: number | null;
  priceBasis: PriceBasis;
  /** True while unpriced: shown as "quotation required", never charged. */
  requiresQuote: boolean;
  /** Extra is only offered alongside one of these categories. */
  categories?: ("honeymoon" | "birthday" | "private_gathering")[];
  /** Excluded from instant booking until an owner approves it. */
  active: boolean;
  /** Shown under the extra to set expectations honestly. */
  note?: string;
}

export const EXTRAS: ExtraDefinition[] = [
  {
    id: "car-rental",
    name: "Luxury car rental",
    summary: "An additional vehicle for the duration of your stay.",
    amount: null,
    priceBasis: "per_stay",
    requiresQuote: true,
    active: true,
    note: "Vehicle, duration and rate are confirmed on your quote.",
  },
  {
    id: "airport-pickup",
    name: "Airport pickup",
    summary: "Collection from Kotoka International Airport.",
    amount: null,
    priceBasis: "per_stay",
    requiresQuote: true,
    active: true,
    note: "Priced by vehicle and arrival time.",
  },
  {
    id: "honeymoon-setup",
    name: "Honeymoon room setup",
    summary: "The room staged before you arrive.",
    amount: null,
    priceBasis: "per_stay",
    requiresQuote: true,
    categories: ["honeymoon"],
    active: true,
    note: "What we can stage is confirmed with you before anything is charged.",
  },
  {
    id: "birthday-decoration",
    name: "Birthday decoration",
    summary: "The room prepared for a birthday.",
    amount: null,
    priceBasis: "per_stay",
    requiresQuote: true,
    categories: ["birthday"],
    active: true,
    note: "Theme and staging are agreed first, then quoted.",
  },
  {
    id: "extra-bed",
    name: "Extra bed",
    summary: "An additional bed in the unit.",
    amount: null,
    priceBasis: "per_stay",
    requiresQuote: true,
    active: true,
    note: "Subject to the unit's approved maximum occupancy.",
  },
];

export function getExtra(id: string): ExtraDefinition | null {
  return EXTRAS.find((extra) => extra.id === id) ?? null;
}

/**
 * Lookup used by the server pricing path. Built once rather than re-scanning the
 * array per extra on every request.
 */
export const EXTRAS_BY_ID: Record<string, ExtraDefinition> = Object.fromEntries(
  EXTRAS.map((extra) => [extra.id, extra]),
);

export function activeExtras(): ExtraDefinition[] {
  return EXTRAS.filter((extra) => extra.active);
}

/**
 * Extras offered for a given occasion. Extras with no `categories` are available
 * on any booking; the others are scoped, so a birthday decoration is not
 * offered to someone booking a plain stay.
 */
export function extrasForCategory(
  category?: "honeymoon" | "birthday" | "private_gathering" | null,
): ExtraDefinition[] {
  return activeExtras().filter(
    (extra) => !extra.categories || (category && extra.categories.includes(category)),
  );
}

/** Extras that can be added to the payable total. None, until an owner prices them. */
export function pricedExtras(): ExtraDefinition[] {
  return activeExtras().filter((extra) => !extra.requiresQuote && extra.amount !== null);
}
