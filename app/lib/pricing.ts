// app/lib/pricing.ts
// ---------------------------------------------------------------------------
// Server-side pricing authority.
//
// This module answers one question: given a set of records the server trusts,
// what may we charge? It resolves the property, the accommodation unit, the
// occasion package and the extras from their sources of truth, then hands the
// records to app/lib/quote.ts for the arithmetic.
//
// WHAT IT REFUSES TO TRUST
//
//   The request body. `amount`, `nights`, `subtotal`, `discount`, `currency`,
//   `packagePrice` and anything else money-shaped are ignored — they are not
//   even read. The only client-supplied values that reach the calculation are
//   *identifiers* (`unitId`, `packageId`, `extraIds`) and *inputs* (dates,
//   occupancy). An identifier selects a record; it never carries a price.
//
// WHY IT REFUSES RATHER THAN GUESSES
//
//   A monthly rate with no approved month definition, a unit with no recorded
//   amount, a rate whose basis is ambiguous — each of these returns a refusal
//   with a reason a guest can read, rather than an amount derived from a guess.
//   Charging a wrong number is worse than not selling.
//
// `server-only` because this is the module that decides what a card is charged.
// It must never reach the browser bundle. The browser uses app/lib/quote.ts with
// records fetched separately, so the on-screen summary and the charge agree
// without the trust decisions leaking client-side.
// ---------------------------------------------------------------------------

import "server-only";

import { normalizeUnits, isMonthlyPolicyConfigured, MONTHLY_POLICY } from "./rates";
import type { AccommodationUnit } from "./rates";
import { EXTRAS_BY_ID } from "./extras";
import { buildQuote, type ExtraInput, type Quote, type QuoteRefusal } from "./quote";
import { nightsBetween } from "./dates";
import { getPackage } from "./packages";

/** The subset of a `villas` row this module needs. */
export interface PriceableVilla {
  id: number;
  title?: string | null;
  price?: number | null;
  guests?: number | null;
  bedrooms?: number | null;
  bathrooms?: number | null;
  rates?: unknown;
}

export interface PricingRequest {
  villa: PriceableVilla;
  /** Identifies the accommodation unit. Never a price. */
  unitId?: string | null;
  checkIn: string;
  checkOut: string;
  /** Overnight occupancy. */
  guests: number;
  /** Identifies an occasion package, when one was chosen. */
  packageId?: string | null;
  /** Identifies extras. Never prices. */
  extraIds?: string[];
  /** Event attendance, when this is an occasion with visitors. */
  attendance?: number | null;
  currency?: string;
}

export interface PricedRequest {
  quote: Quote;
  unit: AccommodationUnit;
  villaId: number;
  villaTitle: string | null;
  nights: number;
  guests: number;
  currency: string;
  /** Occasion track this request should start on. */
  occasionStatus: "none" | "requested";
  packageId: string | null;
  packageName: string | null;
  /** Snapshot stored on the booking so a later package edit cannot rewrite it. */
  packageSnapshot: Record<string, unknown> | null;
}

export type PricingOutcome =
  | { ok: true; priced: PricedRequest }
  | { ok: false; status: number; code: QuoteRefusal | "unknown_unit" | "no_units" | "package_not_found" | "package_not_published"; message: string };

/** HTTP status that matches a refusal, so routes stay thin. */
const STATUS_BY_CODE: Record<string, number> = {
  capacity_exceeded: 409,
  monthly_not_configured: 409,
  unit_unpriced: 409,
  invalid_duration: 400,
  unit_inactive: 409,
  unknown_unit: 400,
  no_units: 409,
  package_not_found: 400,
  package_not_published: 409,
};

/**
 * Resolve and price a request.
 *
 * Pure with respect to the network: the caller loads the villa row.
 */
export function priceRequest(request: PricingRequest): PricingOutcome {
  const { villa, checkIn, checkOut } = request;
  const currency = (request.currency ?? "GHS").toUpperCase().slice(0, 3);

  const nights = nightsBetween(checkIn, checkOut);
  if (nights <= 0) {
    return {
      ok: false,
      status: 400,
      code: "invalid_duration",
      message: "Check-out must be after check-in.",
    };
  }

  const guests = Math.max(1, Math.floor(Number(request.guests) || 1));

  const units = normalizeUnits(villa.rates, {
    price: villa.price ?? null,
    guests: villa.guests ?? null,
    bedrooms: villa.bedrooms ?? null,
    bathrooms: villa.bathrooms ?? null,
  });

  if (!units.length) {
    return {
      ok: false,
      status: 409,
      code: "no_units",
      message:
        "This property has no bookable accommodation configured yet. Send us an enquiry and we will arrange it directly.",
    };
  }

  // --- Resolve the unit -----------------------------------------------------
  // A request may omit the unit; then the cheapest unit that fits the party is
  // chosen, which is the same rule the property page shows. Capacity is checked
  // inside quote.ts, so an over-large party is refused rather than downgraded.
  let unit: AccommodationUnit | undefined;

  if (request.unitId) {
    unit = units.find((candidate) => candidate.id === request.unitId);
    if (!unit) {
      return {
        ok: false,
        status: 400,
        code: "unknown_unit",
        message: "That accommodation is not available at this property.",
      };
    }
  } else {
    const fitting = units.filter(
      (candidate) => candidate.maxGuests === null || candidate.maxGuests >= guests,
    );
    const pool = fitting.length ? fitting : units;
    unit = [...pool].sort((a, b) => a.amount - b.amount)[0];
  }

  if (!unit) {
    return {
      ok: false,
      status: 409,
      code: "no_units",
      message: "No accommodation is available for this request.",
    };
  }

  // --- Resolve the occasion package ----------------------------------------
  let packagePricing = null;
  let occasionStatus: "none" | "requested" = "none";
  let packageName: string | null = null;
  let packageSnapshot: Record<string, unknown> | null = null;

  if (request.packageId) {
    const definition = getPackage(request.packageId);
    if (!definition) {
      return {
        ok: false,
        status: 400,
        code: "package_not_found",
        message: "That package could not be found.",
      };
    }

    packageName = definition.name;

    // Only a published, fully configured fixed-price package may be charged.
    // Everything else is recorded as an occasion REQUEST, which is what keeps a
    // paid room from ever reading as a confirmed celebration.
    const isFixedPrice =
      definition.status === "published" &&
      definition.mode === "fixed_price" &&
      typeof definition.amount === "number" &&
      definition.amount > 0;

    if (isFixedPrice) {
      packagePricing = {
        id: definition.slug,
        name: definition.name,
        priceBasis: definition.priceBasis,
        amount: definition.amount as number,
        requiresQuote: false,
        accommodationIncluded: definition.eligibility?.accommodationIncluded ?? false,
      };
      occasionStatus = "none";
    } else {
      packagePricing = {
        id: definition.slug,
        name: definition.name,
        priceBasis: definition.priceBasis,
        amount: 0,
        requiresQuote: true,
        accommodationIncluded: false,
      };
      occasionStatus = "requested";
    }

    // Snapshot the terms the guest is agreeing to, so a later edit to the
    // package cannot silently rewrite an existing agreement.
    packageSnapshot = {
      capturedAt: new Date().toISOString(),
      slug: definition.slug,
      name: definition.name,
      category: definition.category,
      variant: definition.variant,
      mode: definition.mode,
      status: definition.status,
      priceBasis: definition.priceBasis,
      amount: definition.amount,
      priceNote: definition.priceNote,
      inclusions: definition.inclusions,
      exclusions: definition.exclusions,
      minimumNoticeDays: definition.minimumNoticeDays,
      cancellationPolicyId: definition.cancellationPolicyId,
      eligibility: definition.eligibility,
      capacity: definition.capacity,
    };
  }

  // --- Extras ---------------------------------------------------------------
  const extras: ExtraInput[] = [];
  for (const id of request.extraIds ?? []) {
    const extra = EXTRAS_BY_ID[id];
    if (!extra || !extra.active) continue;
    extras.push({
      id: extra.id,
      name: extra.name,
      // A `requiresQuote` extra is handed over as null so quote.ts emits an
      // unpriced line instead of a number nobody approved.
      amount: extra.requiresQuote ? null : extra.amount,
      priceBasis: extra.priceBasis,
    });
  }

  // --- Build ----------------------------------------------------------------
  const result = buildQuote({
    unit,
    propertyName: villa.title ?? "this property",
    nights,
    guests,
    isEvent: Boolean(request.attendance && request.attendance > 0),
    package: packagePricing,
    extras,
    // No fees, discounts or deposits are configured anywhere, so none are
    // applied. Inventing a cleaning fee or a tax rate is not permitted.
    fees: [],
    discounts: [],
    deposit: null,
    dueNowFraction: null,
  });

  if (!result.ok) {
    return {
      ok: false,
      status: STATUS_BY_CODE[result.code] ?? 400,
      code: result.code,
      message: result.reason,
    };
  }

  return {
    ok: true,
    priced: {
      quote: result.quote,
      unit,
      villaId: villa.id,
      villaTitle: villa.title ?? null,
      nights,
      guests,
      currency,
      occasionStatus,
      packageId: request.packageId ?? null,
      packageName,
      packageSnapshot,
    },
  };
}

/**
 * True when a unit may be sold without a human. Kept here so routes and the UI
 * share one definition.
 */
export function isUnitSellable(unit: AccommodationUnit): boolean {
  if (!unit.active) return false;
  if (unit.priceBasis === "quote") return false;
  if (unit.priceBasis === "monthly" && !isMonthlyPolicyConfigured(MONTHLY_POLICY)) return false;
  if (unit.amount <= 0) return false;
  return true;
}
