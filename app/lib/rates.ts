// app/lib/rates.ts
// ---------------------------------------------------------------------------
// The accommodation model: what a guest can actually book, and how it is priced.
//
// WHY THIS REPLACES `{ option, amount }`
//
//   Rates used to be a bare label/amount pair, and every consumer multiplied the
//   amount by the number of nights. That is only correct for one of the six
//   bases the business needs. The reported "Monthly Rate GHS 30,000 appeared as
//   per-night, so two nights cost GHS 60,000" is the direct consequence: a
//   monthly figure was treated as a nightly one.
//
//   A rate now carries an explicit `priceBasis`. Nothing is multiplied by nights
//   unless its basis is `per_night`.
//
// WHY THERE IS AN INTEGRITY CHECK
//
//   The three rate sources shipped in this repo disagree with each other and
//   with production:
//
//     • app/lib/data.ts                 Lakeside: One bedrooms 1500, Two 2000,
//                                       Whole apartment 3500, Monthly 36000
//     • app/components/villas/villasData.ts
//                                       Adenta: Single bedroom 1500, Studio 2000,
//                                       Two bedrooms 3500 AND 42000 (duplicate
//                                       label), no whole-apartment rate
//     • production `villas.rates`       Adenta: Single bedroom 600, Studio 800
//                                       (only two units); Lakeside carries
//                                       "Monthly Rate (Whole apartment)" 30000
//                                       alongside "Whole apartment (4 bedrooms)"
//                                       36000, where the labels look swapped
//                                       against the amounts
//
//   Guessing which figure is approved would mean inventing prices, which is
//   explicitly out of bounds. So the model records what is there, infers a basis
//   where it can, marks anything uncertain `needsReview`, and surfaces the
//   conflicts as warnings for the owner to resolve in admin. Rates that cannot be
//   safely priced are refused rather than charged.
//
// This module has no "use client" and no "server-only": the browser needs it to
// render unit cards, and the server needs it to price. The *decision* to charge
// still happens only in app/lib/pricing.ts, which is server-only.
// ---------------------------------------------------------------------------

/** How an amount is applied. Nothing is multiplied by nights unless `per_night`. */
export type PriceBasis =
  /** amount × nights */
  | "per_night"
  /** amount once, regardless of nights */
  | "per_stay"
  /** amount × guests (occupancy charge, not duration) */
  | "per_person"
  /** amount once for the event, plus whatever accommodation is added */
  | "per_event"
  /** amount per month — see MONTHLY_POLICY; enquiry-only until configured */
  | "monthly"
  /** no published price; must go through the quotation flow */
  | "quote";

/**
 * Monthly stays cannot be priced until the business defines the commercial
 * terms. Rather than invent them, `monthly` rates are enquiry-only until these
 * are supplied, and every surface says so.
 */
export interface MonthlyPolicy {
  /** Shortest eligible stay, in nights. */
  minimumNights: number | null;
  /** How a "month" is counted, e.g. "30 nights" or "calendar month". */
  monthDefinition: string | null;
  /** How a part-month is handled, or null when no proration is approved. */
  proration: string | null;
}

/**
 * Unconfigured on purpose. There is no approved definition in the repository or
 * the database, and a wrong one silently misprices long stays. Admin sets these
 * before monthly rates can be booked.
 */
export const MONTHLY_POLICY: MonthlyPolicy = {
  minimumNights: null,
  monthDefinition: null,
  proration: null,
};

export function isMonthlyPolicyConfigured(
  policy: MonthlyPolicy = MONTHLY_POLICY,
): boolean {
  return Boolean(
    policy.minimumNights &&
      policy.minimumNights > 0 &&
      policy.monthDefinition?.trim(),
  );
}

/**
 * Whether a unit occupies the whole property or one room within it.
 *
 * This is what makes whole-property and individual-room inventory overlap
 * correctly: a `whole_property` booking conflicts with *every* unit at that
 * property, while a `room` booking conflicts with the same room and with any
 * whole-property booking.
 */
export type UnitKind = "room" | "whole_property";

/** Who can use the pool while staying in this unit. */
export type PoolAccess = "exclusive" | "shared" | "none";

export interface AccommodationUnit {
  /** Stable within the property. Derived from the label when not stored. */
  id: string;
  /** Guest-facing name. Grammar-corrected, meaning preserved. */
  name: string;
  /** The name exactly as stored, kept for admin display and diffing. */
  sourceLabel: string;
  kind: UnitKind;
  priceBasis: PriceBasis;
  /** Major units in the property's base currency (GHS). 0 when unpriced. */
  amount: number;
  /** Max permitted guests for THIS unit. Null when the owner has not said. */
  maxGuests: number | null;
  bedrooms: number | null;
  beds: number | null;
  bathrooms: number | null;
  kitchen: boolean | null;
  pool: PoolAccess | null;
  exclusiveAreas?: string;
  sharedAreas?: string;
  /** Excluded from sale until an admin publishes it. */
  active: boolean;
  /** True when the basis or amount was inferred rather than configured. */
  needsReview: boolean;
  /** Why it needs review, in words an owner can act on. */
  reviewNote?: string;
}

/** The stored shape. Superset of the legacy `{ option, amount }`. */
export interface StoredRate {
  option?: string;
  amount?: number;
  id?: string;
  kind?: UnitKind;
  priceBasis?: PriceBasis;
  maxGuests?: number;
  bedrooms?: number;
  beds?: number;
  bathrooms?: number;
  kitchen?: boolean;
  pool?: PoolAccess;
  exclusiveAreas?: string;
  sharedAreas?: string;
  active?: boolean;
}

// ---------------------------------------------------------------------------
// Label handling
// ---------------------------------------------------------------------------

/**
 * Grammar fixes for label text that reached production. Meaning is preserved —
 * "One bedrooms" becomes "One-bedroom apartment", not a different unit.
 */
const LABEL_CORRECTIONS: [RegExp, string][] = [
  [/^one bedrooms?$/i, "One-bedroom apartment"],
  [/^two bedrooms?$/i, "Two-bedroom apartment"],
  [/^three bedrooms?$/i, "Three-bedroom apartment"],
  [/^four bedrooms?$/i, "Four-bedroom apartment"],
  [/^single bedroom$/i, "Single bedroom"],
  [/^studio$/i, "Studio"],
];

/** "Month" in the label is the strongest available signal that it is not a nightly rate. */
const MONTHLY_LABEL = /\bmonth(ly)?\b|\/month\b|\bper month\b/i;

/** "Whole apartment/property/house" means exclusive use of the entire property. */
const WHOLE_PROPERTY_LABEL = /\bwhole\b|\bentire\b|\bexclusive use\b|\b(apartment|property|house)\s*\(\s*\d+\s*bedrooms?\s*\)/i;

export function correctLabel(label: string): string {
  const trimmed = label.trim().replace(/\s+/g, " ");
  const hit = LABEL_CORRECTIONS.find(([re]) => re.test(trimmed));
  // A "Whole apartment (4 bedrooms)" label keeps its parenthetical, which carries
  // real information, but its base name is corrected like any other.
  if (hit) {
    const parenthetical = trimmed.slice(hit[0].toString().length).trim();
    return parenthetical ? `${hit[1]} ${parenthetical}` : hit[1];
  }
  return trimmed;
}

/** Stable, URL-safe id derived from a label. */
export function unitIdFromLabel(label: string): string {
  return label
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60) || "unit";
}

function stripParenthetical(label: string): string {
  return label.replace(/\s*\([^)]*\)\s*/g, " ").trim();
}

/**
 * Best available guess at a rate's basis, used only when the stored JSON has no
 * explicit `priceBasis`. Anything inferred is flagged for review.
 */
export function inferBasis(label: string, amount: number | undefined): PriceBasis {
  // The label is the only reliable signal available when no basis is stored. An
  // amount alone cannot tell nightly from monthly — a high figure might be a
  // genuine premium rate — so nothing is inferred from magnitude here. Such cases
  // surface through rateWarnings() as blocking outliers instead.
  if (MONTHLY_LABEL.test(label)) return "monthly";

  if (typeof amount !== "number" || !Number.isFinite(amount) || amount <= 0) {
    return "quote";
  }

  return "per_night";
}

// ---------------------------------------------------------------------------
// Normalisation
// ---------------------------------------------------------------------------

/**
 * Turn whatever is stored into a consistent, safe unit list.
 *
 * @param raw        `villas.rates` as stored (unknown shape).
 * @param fallback   The property's headline `price`, used when a rate has no
 *                   amount of its own.
 */
export function normalizeUnits(
  raw: unknown,
  fallback?: { price?: number | null; guests?: number | null; bedrooms?: number | null; bathrooms?: number | null },
): AccommodationUnit[] {
  if (!Array.isArray(raw)) return [];

  const stored = raw.filter(
    (entry): entry is StoredRate =>
      typeof entry === "object" && entry !== null && !Array.isArray(entry),
  );

  const seenIds = new Map<string, number>();

  return stored.map((entry) => {
    const sourceLabel = String(entry.option ?? "").trim();
    const name = correctLabel(sourceLabel || "Rate");
    const amount =
      typeof entry.amount === "number" && Number.isFinite(entry.amount) ? entry.amount : 0;

    const explicitBasis = entry.priceBasis;
    // No third argument: the previous call passed the entry's OWN amount as the
    // "monthly hint", so the equality check in inferBasis was trivially true and
    // every amount at or above the hint threshold was classified monthly. That
    // would have silently turned a legitimate high nightly rate into an
    // enquiry-only one, and it is why the 42,000 Adenta figure was not flagged.
    const priceBasis: PriceBasis = explicitBasis ?? inferBasis(sourceLabel, amount);

    // Disambiguate duplicate labels rather than silently dropping one. The
    // production Adenta row genuinely carried "Two bedrooms" twice at two very
    // different amounts; collapsing them would hide a real data conflict.
    const baseId = entry.id?.trim() || unitIdFromLabel(sourceLabel || name);
    const priorCount = seenIds.get(baseId) ?? 0;
    seenIds.set(baseId, priorCount + 1);
    const id = priorCount === 0 ? baseId : `${baseId}-${priorCount + 1}`;

    const kind: UnitKind =
      entry.kind ?? (WHOLE_PROPERTY_LABEL.test(sourceLabel) ? "whole_property" : "room");

    const needsReview = !explicitBasis || priceBasis === "quote" || priceBasis === "monthly";

    let reviewNote: string | undefined;
    if (!explicitBasis) {
      reviewNote = `Price basis was inferred as "${priceBasis}" from the label "${sourceLabel}". Confirm or change it in admin.`;
    }
    if (priceBasis === "monthly") {
      reviewNote =
        "Monthly pricing is enquiry-only until the monthly terms (minimum stay, month definition, proration) are configured.";
    }
    if (priceBasis === "quote") {
      reviewNote = "No amount is recorded for this rate, so it can only be quoted.";
    }
    if (priorCount > 0) {
      reviewNote = `${reviewNote ? reviewNote + " " : ""}Another rate on this property has the same label. Both are kept so the conflict is visible.`;
    }

    // Defaults: a whole-property unit is the whole house, so it inherits the
    // property's own capacity. A room unit is deliberately left null rather than
    // inheriting the property total, because showing a property-wide guest count
    // against a single room is exactly the bug this model exists to prevent.
    const maxGuests =
      typeof entry.maxGuests === "number"
        ? entry.maxGuests
        : kind === "whole_property"
          ? (fallback?.guests ?? null)
          : null;

    return {
      id,
      name,
      sourceLabel: sourceLabel || name,
      kind,
      priceBasis,
      amount,
      maxGuests,
      bedrooms:
        typeof entry.bedrooms === "number"
          ? entry.bedrooms
          : kind === "whole_property"
            ? (fallback?.bedrooms ?? null)
            : null,
      beds: typeof entry.beds === "number" ? entry.beds : null,
      bathrooms:
        typeof entry.bathrooms === "number"
          ? entry.bathrooms
          : kind === "whole_property"
            ? (fallback?.bathrooms ?? null)
            : null,
      kitchen: typeof entry.kitchen === "boolean" ? entry.kitchen : null,
      pool: entry.pool ?? null,
      exclusiveAreas: entry.exclusiveAreas,
      sharedAreas: entry.sharedAreas,
      active: entry.active !== false,
      needsReview,
      reviewNote,
    } satisfies AccommodationUnit;
  });
}

// ---------------------------------------------------------------------------
// Integrity warnings
// ---------------------------------------------------------------------------

export interface RateWarning {
  unitId: string;
  unitName: string;
  severity: "blocker" | "warning";
  message: string;
}

/**
 * Problems an owner must resolve. `blocker` means the unit cannot be sold on the
 * basis recorded; `warning` means it will be sold but looks wrong.
 */
export function rateWarnings(units: AccommodationUnit[]): RateWarning[] {
  const warnings: RateWarning[] = [];

  const nightly = units.filter(
    (unit) => unit.active && unit.priceBasis === "per_night" && unit.amount > 0,
  );
  const cheapestNightly = nightly.length
    ? Math.min(...nightly.map((unit) => unit.amount))
    : null;

  for (const unit of units) {
    if (unit.priceBasis === "quote") {
      warnings.push({
        unitId: unit.id,
        unitName: unit.name,
        severity: "blocker",
        message: "No amount is recorded, so this unit cannot be paid for online. It is enquiry-only.",
      });
      continue;
    }

    if (unit.priceBasis === "monthly" && !isMonthlyPolicyConfigured()) {
      warnings.push({
        unitId: unit.id,
        unitName: unit.name,
        severity: "blocker",
        message:
          "Monthly pricing is enquiry-only until the monthly terms are configured, so this unit cannot be booked online.",
      });
      continue;
    }

    if (unit.priceBasis === "per_night" && cheapestNightly && unit.amount >= cheapestNightly * 15) {
      // Blocking, not advisory. An unflagged 15x outlier is far more likely a
      // monthly or per-stay figure recorded against a nightly basis than a real
      // nightly rate — and if it is real, the owner confirms it in admin in one
      // place. Charging it by mistake is a customer-relations disaster and the
      // exact defect class reported. The unit stays visible as an enquiry.
      warnings.push({
        unitId: unit.id,
        unitName: unit.name,
        severity: "blocker",
        message:
          `GHS ${unit.amount.toLocaleString()} per night is more than 15x the cheapest nightly rate ` +
          `(GHS ${cheapestNightly.toLocaleString()}) on this property. A figure this size is usually a ` +
          `monthly or per-stay amount recorded against a nightly basis, so it cannot be sold online ` +
          `until you confirm its basis in admin.`,
      });
    }

    if (unit.kind === "room" && unit.maxGuests === null) {
      warnings.push({
        unitId: unit.id,
        unitName: unit.name,
        severity: "warning",
        message:
          "Maximum guests for this room is not recorded, so checkout cannot state the unit's true capacity. Set it in admin.",
      });
    }
  }

  // A whole-property rate cheaper than one of its rooms is always a data error.
  const whole = units.filter(
    (unit) => unit.kind === "whole_property" && unit.priceBasis === "per_night" && unit.amount > 0,
  );
  const rooms = units.filter(
    (unit) => unit.kind === "room" && unit.priceBasis === "per_night" && unit.amount > 0,
  );
  const priciestRoom = rooms.length ? Math.max(...rooms.map((unit) => unit.amount)) : null;

  if (priciestRoom !== null) {
    for (const unit of whole) {
      if (unit.amount < priciestRoom) {
        warnings.push({
          unitId: unit.id,
          unitName: unit.name,
          severity: "blocker",
          message:
            `Cheaper per night than a single room on the same property ` +
            `(GHS ${unit.amount.toLocaleString()} vs GHS ${priciestRoom.toLocaleString()}), which means the ` +
            `labels or the amounts have been swapped. Not sold online until corrected in admin.`,
        });
      }
    }
  }

  return warnings;
}

// ---------------------------------------------------------------------------
// Listing price
// ---------------------------------------------------------------------------

export interface FromPrice {
  amount: number;
  /** The unit the figure came from, so the claim can be traced. */
  unitName: string;
  basis: PriceBasis;
}

/**
 * The lowest price we may honestly advertise.
 *
 * Only a published `per_night` rate qualifies: a "From GHS 1,500/night" badge
 * built from a monthly or per-stay figure is how the listing card and the detail
 * page came to disagree. Returns null when nothing eligible exists, and the
 * caller shows "Request a quote" instead.
 */
export function fromNightlyPrice(units: AccommodationUnit[]): FromPrice | null {
  const eligible = units.filter(
    (unit) => unit.active && unit.priceBasis === "per_night" && unit.amount > 0,
  );
  if (!eligible.length) return null;

  const cheapest = eligible.reduce((min, unit) => (unit.amount < min.amount ? unit : min));
  return { amount: cheapest.amount, unitName: cheapest.name, basis: cheapest.priceBasis };
}

/**
 * How the unit's price is expressed, for appending after a formatted amount.
 *
 * The property page previously printed " / night" unconditionally next to every
 * rate, which is how a monthly figure came to be displayed — and charged — as a
 * nightly one.
 */
export function priceBasisSuffix(basis: PriceBasis): string {
  switch (basis) {
    case "per_night":
      return "/ night";
    case "per_stay":
      return "/ stay";
    case "per_person":
      return "/ guest";
    case "per_event":
      return "/ event";
    case "monthly":
      return "/ month";
    case "quote":
    default:
      return "";
  }
}

/**
 * True when the unit cannot be priced online, so the UI must offer an enquiry
 * rather than a price. Monthly units qualify while the monthly terms are
 * unconfigured (see MONTHLY_POLICY).
 */
export function isEnquiryOnly(unit: AccommodationUnit): boolean {
  if (!unit.active) return true;
  if (unit.priceBasis === "quote") return true;
  if (unit.amount <= 0) return true;
  if (unit.priceBasis === "monthly" && !isMonthlyPolicyConfigured()) return true;
  return false;
}

/** Human description of a unit's capacity, never borrowing the property total. */
export function unitCapacityLabel(unit: AccommodationUnit): string {
  const parts: string[] = [];
  if (unit.maxGuests !== null) {
    parts.push(`Up to ${unit.maxGuests} guest${unit.maxGuests === 1 ? "" : "s"}`);
  }
  if (unit.bedrooms !== null) {
    parts.push(`${unit.bedrooms} bedroom${unit.bedrooms === 1 ? "" : "s"}`);
  }
  if (unit.beds !== null) {
    parts.push(`${unit.beds} bed${unit.beds === 1 ? "" : "s"}`);
  }
  if (unit.bathrooms !== null) {
    parts.push(`${unit.bathrooms} bathroom${unit.bathrooms === 1 ? "" : "s"}`);
  }
  return parts.join(" · ");
}

/** Facilities, stated only where the owner has recorded them. */
export function unitFacilityLabels(unit: AccommodationUnit): string[] {
  const labels: string[] = [];
  if (unit.kitchen === true) labels.push("Kitchen access");
  if (unit.kitchen === false) labels.push("No kitchen access");
  if (unit.pool === "exclusive") labels.push("Private pool");
  if (unit.pool === "shared") labels.push("Shared pool");
  if (unit.pool === "none") labels.push("No pool access");
  if (unit.exclusiveAreas) labels.push(`Exclusive: ${unit.exclusiveAreas}`);
  if (unit.sharedAreas) labels.push(`Shared: ${unit.sharedAreas}`);
  return labels;
}

/** Units a guest may actually book online, as opposed to enquire about. */
export function bookableUnits(units: AccommodationUnit[]): AccommodationUnit[] {
  return units.filter(
    (unit) =>
      unit.active &&
      unit.priceBasis !== "quote" &&
      (unit.priceBasis !== "monthly" || isMonthlyPolicyConfigured()),
  );
}
