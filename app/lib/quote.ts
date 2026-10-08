// app/lib/quote.ts
// ---------------------------------------------------------------------------
// The one place a total is calculated — as pure arithmetic over explicit inputs.
//
// WHY THIS IS SEPARATE FROM app/lib/pricing.ts
//
//   This module decides nothing about trust. It takes a unit, a duration, an
//   occupancy and a list of optional charges, and returns an itemised quote. Any
//   caller can run it, which is the point: the browser needs the identical
//   numbers to render an order summary, and the server needs them to set the
//   amount it charges. Two implementations of the same arithmetic is how the
//   order summary and the card charge drift apart.
//
//   What the *server* — and only the server — does is decide which inputs are
//   trustworthy. `app/lib/pricing.ts` (server-only) loads the unit, the package
//   and the extras from the database and ignores anything the request body says
//   about money. This file is given those records and does the maths.
//
// PRICE BASES
//
//   The reported "Monthly Rate GHS 30,000 appeared as per-night, so two nights
//   cost GHS 60,000" happened because every amount was multiplied by nights. Here
//   the basis decides the arithmetic:
//
//     per_night   amount × nights
//     per_stay    amount, once
//     per_person  amount × guests
//     per_event   amount, once
//     monthly     refused unless an approved monthly policy exists
//     quote       refused as a price; listed as a separate unpriced line
// ---------------------------------------------------------------------------

import type { AccommodationUnit, PriceBasis } from "./rates";
import { MONTHLY_POLICY, isMonthlyPolicyConfigured } from "./rates";

/** Where a line sits in the order summary. Drives grouping and emphasis. */
export type QuoteLineCategory =
  | "accommodation"
  | "package"
  | "attendees"
  | "extra"
  | "fee"
  | "discount"
  | "deposit";

export interface QuoteLine {
  id: string;
  label: string;
  /** The arithmetic, in words: "GHS 1,500 x 3 nights". */
  detail?: string;
  /** Major units. Negative for discounts. */
  amount: number;
  category: QuoteLineCategory;
  /** True when this is a refundable hold, not a charge. */
  refundable?: boolean;
  /** True when the line is intentionally excluded from the payable amount. */
  excludedFromPayable?: boolean;
}

export interface PackagePricing {
  id: string;
  name: string;
  priceBasis: PriceBasis;
  /** Major units. 0 when `requiresQuote`. */
  amount: number;
  requiresQuote: boolean;
  accommodationIncluded: boolean;
}

export interface ExtraInput {
  id: string;
  name: string;
  /** Major units. Null means the extra is unpriced and must be quoted. */
  amount: number | null;
  priceBasis: PriceBasis;
  quantity?: number;
}

export interface FeeInput {
  id: string;
  name: string;
  /** Major units. Null means the fee is not configured and is not charged. */
  amount: number | null;
  /** Refundable fees are shown separately and are not revenue. */
  refundable?: boolean;
  /** Multiplied by guests, e.g. a per-person cleaning levy. */
  perPerson?: boolean;
}

export interface DiscountInput {
  id: string;
  name: string;
  /** Major units, positive. Subtracted as-is. */
  amount: number;
}

export interface DepositPolicy {
  /** Major units, refundable. */
  amount: number;
  /** What it covers, in the owner's words. */
  description?: string;
}

export interface QuoteInput {
  unit: AccommodationUnit;
  propertyName: string;
  nights: number;
  guests: number;
  isEvent?: boolean;
  package?: PackagePricing | null;
  extras?: ExtraInput[];
  fees?: FeeInput[];
  discounts?: DiscountInput[];
  deposit?: DepositPolicy | null;
  /** ISO date the remaining balance falls due, when the owner has configured one. */
  balanceDueDate?: string | null;
  /** Fraction of the total payable now, e.g. 0.3 for a 30% deposit. Null = pay in full. */
  dueNowFraction?: number | null;
}

export interface Quote {
  lines: QuoteLine[];
  accommodationSubtotal: number;
  packageSubtotal: number;
  extrasSubtotal: number;
  feesSubtotal: number;
  discountTotal: number;
  /** Refundable, so excluded from `total`. */
  refundableDeposit: number;
  total: number;
  dueNow: number;
  balanceDue: number;
  balanceDueDate: string | null;
  /** Labels that require a quote. Present in `lines` but not in `total`. */
  unpricedItems: string[];
  /** True when the payable amount is settled in full at checkout. */
  paidInFull: boolean;
}

export type QuoteResult =
  | { ok: true; quote: Quote }
  | { ok: false; reason: string; code: QuoteRefusal };

export type QuoteRefusal =
  | "capacity_exceeded"
  | "monthly_not_configured"
  | "unit_unpriced"
  | "invalid_duration"
  | "unit_inactive";

/** Money is rounded to the minor unit once per line, then summed. */
function round2(value: number): number {
  return Math.round(value * 100) / 100;
}

function formatMajor(value: number): string {
  return value.toLocaleString(undefined, {
    minimumFractionDigits: value % 1 === 0 ? 0 : 2,
    maximumFractionDigits: 2,
  });
}

/**
 * Price one unit for a duration and occupancy.
 *
 * Exported because the property page and the package pages show a unit price
 * without building a whole quote.
 */
export function priceUnit(
  unit: AccommodationUnit,
  nights: number,
  guests: number,
): { ok: true; amount: number; detail: string } | { ok: false; code: QuoteRefusal; reason: string } {
  if (!unit.active) {
    return { ok: false, code: "unit_inactive", reason: `${unit.name} is not currently available.` };
  }

  if (unit.maxGuests !== null && guests > unit.maxGuests) {
    return {
      ok: false,
      code: "capacity_exceeded",
      reason:
        `${unit.name} takes a maximum of ${unit.maxGuests} guest${unit.maxGuests === 1 ? "" : "s"}. ` +
        `Choose a larger unit or property, or send us a group enquiry.`,
    };
  }

  switch (unit.priceBasis) {
    case "per_night": {
      if (nights <= 0) {
        return { ok: false, code: "invalid_duration", reason: "Check-out must be after check-in." };
      }
      if (unit.amount <= 0) {
        return { ok: false, code: "unit_unpriced", reason: `${unit.name} has no published nightly rate.` };
      }
      return {
        ok: true,
        amount: round2(unit.amount * nights),
        detail: `GHS ${formatMajor(unit.amount)} x ${nights} night${nights === 1 ? "" : "s"}`,
      };
    }

    case "per_stay": {
      if (nights <= 0) {
        return { ok: false, code: "invalid_duration", reason: "Check-out must be after check-in." };
      }
      if (unit.amount <= 0) {
        return { ok: false, code: "unit_unpriced", reason: `${unit.name} has no published price.` };
      }
      return {
        ok: true,
        amount: round2(unit.amount),
        detail: `Per stay, ${nights} night${nights === 1 ? "" : "s"}`,
      };
    }

    case "per_person": {
      if (nights <= 0) {
        return { ok: false, code: "invalid_duration", reason: "Check-out must be after check-in." };
      }
      if (unit.amount <= 0) {
        return { ok: false, code: "unit_unpriced", reason: `${unit.name} has no published per-person rate.` };
      }
      return {
        ok: true,
        amount: round2(unit.amount * guests),
        detail: `GHS ${formatMajor(unit.amount)} x ${guests} guest${guests === 1 ? "" : "s"}`,
      };
    }

    case "per_event": {
      if (unit.amount <= 0) {
        return { ok: false, code: "unit_unpriced", reason: `${unit.name} has no published event rate.` };
      }
      return { ok: true, amount: round2(unit.amount), detail: "Per event" };
    }

    case "monthly": {
      // Deliberately refused rather than approximated. Multiplying a monthly
      // figure by nights is the exact defect this model replaces, and no approved
      // month definition exists to compute from.
      if (!isMonthlyPolicyConfigured(MONTHLY_POLICY)) {
        return {
          ok: false,
          code: "monthly_not_configured",
          reason:
            `${unit.name} is a monthly rate. Monthly stays are enquiry-only until the ` +
            `monthly terms (minimum stay, how a month is counted, and any part-month ` +
            `proration) are set in admin. Send an enquiry and we will quote you.`,
        };
      }
      return { ok: false, code: "monthly_not_configured", reason: "Monthly pricing is not yet enabled." };
    }

    case "quote":
    default:
      return {
        ok: false,
        code: "unit_unpriced",
        reason: `${unit.name} is priced by quotation. Send an enquiry and we will prepare a quote.`,
      };
  }
}

/**
 * Build the full itemised quote.
 *
 * Unpriced items are included as lines so the guest can see what is outstanding,
 * but they carry `excludedFromPayable` and never reach `total`. A summary that
 * quietly folded an unquoted celebration into the room subtotal, or that charged
 * a room-only amount while calling the whole thing confirmed, is the failure this
 * prevents.
 */
export function buildQuote(input: QuoteInput): QuoteResult {
  const { unit, propertyName, nights, guests } = input;

  const priced = priceUnit(unit, nights, guests);
  if (!priced.ok) {
    return { ok: false, code: priced.code, reason: priced.reason };
  }

  const lines: QuoteLine[] = [];
  const unpricedItems: string[] = [];

  lines.push({
    id: "accommodation",
    label: unit.kind === "whole_property" ? `${propertyName} — entire property` : unit.name,
    detail: priced.detail,
    amount: priced.amount,
    category: "accommodation",
  });
  const accommodationSubtotal = priced.amount;

  // --- Occasion package -----------------------------------------------------
  let packageSubtotal = 0;
  if (input.package) {
    const pkg = input.package;

    if (pkg.requiresQuote) {
      unpricedItems.push(pkg.name);
      lines.push({
        id: `package-${pkg.id}`,
        label: pkg.name,
        detail: "Quotation required — not payable today",
        amount: 0,
        category: "package",
        excludedFromPayable: true,
      });
    } else {
      const packageAmount = round2(pkg.amount);
      packageSubtotal = packageAmount;
      lines.push({
        id: `package-${pkg.id}`,
        label: pkg.name,
        detail:
          pkg.priceBasis === "per_person"
            ? `GHS ${formatMajor(pkg.amount)} x ${guests} guest${guests === 1 ? "" : "s"}`
            : pkg.accommodationIncluded
              ? "Includes the accommodation shown above"
              : pkg.priceBasis === "per_event"
                ? "Per event"
                : "Package price",
        amount: packageAmount,
        category: "package",
      });

      // The package may itself be charged per person; the engine has to honour the
      // basis rather than always taking the headline figure.
      if (pkg.priceBasis === "per_person") {
        const recalculated = round2(pkg.amount * guests);
        lines[lines.length - 1].amount = recalculated;
        packageSubtotal = recalculated;
      }
    }
  }

  // --- Per-person charges beyond the base occupancy -------------------------
  let attendeesSubtotal = 0;
  if (input.isEvent) {
    for (const fee of input.fees ?? []) {
      if (!fee.perPerson || fee.amount === null) continue;
      const amount = round2(fee.amount * guests);
      attendeesSubtotal += amount;
      lines.push({
        id: `attendee-${fee.id}`,
        label: fee.name,
        detail: `GHS ${formatMajor(fee.amount)} x ${guests} guest${guests === 1 ? "" : "s"}`,
        amount,
        category: "attendees",
      });
    }
  }

  // --- Extras ---------------------------------------------------------------
  let extrasSubtotal = 0;
  for (const extra of input.extras ?? []) {
    if (extra.amount === null) {
      unpricedItems.push(extra.name);
      lines.push({
        id: `extra-${extra.id}`,
        label: extra.name,
        detail: "Quotation required — not payable today",
        amount: 0,
        category: "extra",
        excludedFromPayable: true,
      });
      continue;
    }

    const quantity = Math.max(1, extra.quantity ?? 1);
    const unitAmount =
      extra.priceBasis === "per_person" ? extra.amount * guests : extra.amount;
    const amount = round2(unitAmount * quantity);
    extrasSubtotal += amount;

    lines.push({
      id: `extra-${extra.id}`,
      label: extra.name,
      detail:
        extra.priceBasis === "per_person"
          ? `GHS ${formatMajor(extra.amount)} x ${guests} guest${guests === 1 ? "" : "s"}`
          : quantity > 1
            ? `GHS ${formatMajor(extra.amount)} x ${quantity}`
            : undefined,
      amount,
      category: "extra",
    });
  }

  // --- Mandatory fees -------------------------------------------------------
  // Only fees an owner has actually configured. Nothing is invented here: an
  // unset fee contributes nothing rather than a guessed rate.
  let feesSubtotal = 0;
  let refundableDeposit = 0;

  for (const fee of input.fees ?? []) {
    if (fee.amount === null || fee.perPerson) continue;

    const amount = round2(fee.amount);
    if (fee.refundable) {
      refundableDeposit += amount;
    } else {
      feesSubtotal += amount;
    }

    lines.push({
      id: `fee-${fee.id}`,
      label: fee.name,
      detail: fee.refundable ? "Refundable" : undefined,
      amount,
      category: fee.refundable ? "deposit" : "fee",
      refundable: fee.refundable,
    });
  }

  if (input.deposit && input.deposit.amount > 0) {
    refundableDeposit += round2(input.deposit.amount);
    lines.push({
      id: "deposit",
      label: "Refundable damage deposit",
      detail: input.deposit.description ?? "Returned after checkout, subject to the property condition",
      amount: round2(input.deposit.amount),
      category: "deposit",
      refundable: true,
    });
  }

  // --- Discounts ------------------------------------------------------------
  let discountTotal = 0;
  for (const discount of input.discounts ?? []) {
    const amount = round2(discount.amount);
    if (amount <= 0) continue;
    discountTotal += amount;
    lines.push({
      id: `discount-${discount.id}`,
      label: discount.name,
      amount: -amount,
      category: "discount",
    });
  }

  const chargesBeforeDeposit =
    accommodationSubtotal + packageSubtotal + attendeesSubtotal + extrasSubtotal + feesSubtotal - discountTotal;

  const total = round2(Math.max(0, chargesBeforeDeposit));

  const fraction =
    typeof input.dueNowFraction === "number" && input.dueNowFraction > 0 && input.dueNowFraction < 1
      ? input.dueNowFraction
      : null;

  const dueNow = fraction ? round2(total * fraction) : total;
  const balanceDue = round2(total - dueNow);

  return {
    ok: true,
    quote: {
      lines,
      accommodationSubtotal: round2(accommodationSubtotal),
      packageSubtotal: round2(packageSubtotal),
      extrasSubtotal: round2(extrasSubtotal + attendeesSubtotal),
      feesSubtotal: round2(feesSubtotal),
      discountTotal: round2(discountTotal),
      refundableDeposit: round2(refundableDeposit),
      total,
      dueNow,
      balanceDue,
      balanceDueDate: balanceDue > 0 ? (input.balanceDueDate ?? null) : null,
      unpricedItems,
      paidInFull: balanceDue === 0,
    },
  };
}

/**
 * Capacity check that never implies a property can exceed its approved occupancy.
 *
 * A group larger than every unit is offered an enquiry, not a larger unit.
 */
export function findUnitsForGuests<T extends AccommodationUnit>(
  units: T[],
  guests: number,
): { suited: T[]; tooSmall: T[] } {
  const suited: T[] = [];
  const tooSmall: T[] = [];

  for (const unit of units) {
    if (unit.maxGuests === null || unit.maxGuests >= guests) suited.push(unit);
    else tooSmall.push(unit);
  }

  return { suited, tooSmall };
}

/** The largest occupancy any unit on a property will actually accept. */
export function maxPropertyOccupancy(units: AccommodationUnit[]): number | null {
  const capacities = units
    .filter((unit) => unit.active && unit.maxGuests !== null)
    .map((unit) => unit.maxGuests as number);
  return capacities.length ? Math.max(...capacities) : null;
}
