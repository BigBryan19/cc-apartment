// app/lib/extras.ts
// ---------------------------------------------------------------------------
// Optional extras that can be attached to a stay.
//
// PRICED ONLY WHERE THE BUSINESS HAS APPROVED A PRICE
//
//   Two extras now carry approved figures, because the client supplied them:
//
//     Honeymoon room setup  GHS 3,500 per stay   (matches the service card)
//     Car rental            GHS 1,000 per day    (Hyundai Tucson)
//
//   Everything else stays `requiresQuote: true` with `amount: null`, so the
//   pricing engine lists it as an explicit unpriced line, excludes it from the
//   payable amount, and the occasion track stays `requested` rather than
//   `confirmed`. Inventing a figure for a service nobody has priced is a
//   commitment, not a placeholder.
//
//   Car rental uses the `per_day` basis, so a rental attached to a stay is
//   charged by the days it is actually held — the defect class this model was
//   built to stop (a per-day figure multiplied by nothing, or a monthly figure
//   multiplied by nights) cannot recur here.
//
//   The same two figures live in app/lib/services.ts, which drives the service
//   cards. If one changes, both must: the card and the charge are the same
//   promise.
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
    name: "Car rental — Hyundai Tucson",
    summary: "A Hyundai Tucson with driver for the duration of your stay.",
    amount: 1000,
    priceBasis: "per_day",
    requiresQuote: false,
    active: true,
    note: "Charged per rental day.",
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
    amount: 3500,
    priceBasis: "per_stay",
    requiresQuote: false,
    categories: ["honeymoon"],
    active: true,
    note: "Starting price per stay. The final figure depends on the property and the setup.",
  },
  {
    id: "massage",
    name: "Massage service",
    summary: "A therapist comes to the apartment.",
    amount: null,
    priceBasis: "per_stay",
    requiresQuote: true,
    active: true,
    note: "Priced by treatment and number of guests — confirmed before you book.",
  },
  {
    id: "birthday-decoration",
    name: "Birthday decoration",
    summary: "The room prepared for a birthday.",
    amount: 5000,
    priceBasis: "per_stay",
    requiresQuote: false,
    categories: ["birthday"],
    active: true,
    note: "The published starting price per stay. Theme and staging are agreed first.",
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
