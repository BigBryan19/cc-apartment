// app/lib/pricing.ts
// ---------------------------------------------------------------------------
// Server-authoritative pricing.
//
// SECURITY: the browser must never be able to choose what it pays. Previously
// /api/payments/paystack/initialize took `amount` straight from the request
// body and forwarded it to Paystack, so a crafted POST could buy a GH₵3,500
// stay for GH₵1. `nights` had the same problem, which also meant a receipt
// could print a night count that contradicted its own dates.
//
// Every route that touches money now derives both numbers here, from the
// property row in the database plus the two date keys. The only thing a client
// may choose is *which* named rate it wants ("Whole apartment"); the price of
// that rate comes from `villas.rates`.
//
// `server-only` because this is the module that decides how much a card is
// charged — it must never reach the browser bundle.
// ---------------------------------------------------------------------------

import "server-only";

import { nightsBetween } from "./dates";

/** One row of `villas.rates`: [{ "option": "Whole apartment", "amount": 3500 }] */
export interface VillaRate {
  option?: string;
  amount?: number;
}

/** The subset of a `villas` row that pricing needs. */
export interface PriceableVilla {
  id: number;
  title?: string | null;
  price?: number | null;
  rates?: unknown;
}

export interface StayQuote {
  villaId: number;
  villaTitle: string | null;
  /** The named rate the guest picked, or null when the headline price applies. */
  rateLabel: string | null;
  /** Major units, per night. */
  nightlyRate: number;
  nights: number;
  /** Major units. nightlyRate * nights. */
  total: number;
}

export type QuoteResult =
  | { ok: true; quote: StayQuote }
  | { ok: false; status: number; message: string };

/**
 * Ceiling on a single transaction, in major units. Paystack's own limits vary by
 * currency and are lower than this; the point is to reject an absurd number
 * before it reaches the gateway, not to model Paystack exactly.
 */
export const MAX_AMOUNT = 10_000_000;

/** Narrow `villas.rates` (jsonb) to a usable array without trusting its shape. */
export function parseRates(value: unknown): VillaRate[] {
  if (!Array.isArray(value)) return [];

  return value.filter(
    (entry): entry is VillaRate =>
      typeof entry === "object" && entry !== null && !Array.isArray(entry),
  );
}

/**
 * Price a stay. Returns the authoritative nightly rate, night count and total,
 * or a user-facing reason why the stay cannot be priced.
 *
 * `requestedRate` is the only client-supplied input that influences the result,
 * and it is treated as a *lookup key* — never as a price.
 */
export function quoteStay(
  villa: PriceableVilla,
  checkInKey: string,
  checkOutKey: string,
  requestedRate?: string | null,
): QuoteResult {
  const nights = nightsBetween(checkInKey, checkOutKey);
  if (nights <= 0) {
    return {
      ok: false,
      status: 400,
      message: "Check-out must be after check-in.",
    };
  }

  const requested =
    typeof requestedRate === "string" && requestedRate.trim()
      ? requestedRate.trim()
      : null;

  let nightlyRate: number;
  let rateLabel: string | null = null;

  if (requested) {
    const match = parseRates(villa.rates).find((rate) => rate.option === requested);

    if (!match) {
      return {
        ok: false,
        status: 409,
        message: `This property has no rate called "${requested}".`,
      };
    }

    nightlyRate = Number(match.amount);
    rateLabel = requested;
  } else {
    // No named rate requested — fall back to the headline nightly price.
    nightlyRate = Number(villa.price);
  }

  if (!Number.isFinite(nightlyRate) || nightlyRate <= 0) {
    return {
      ok: false,
      status: 409,
      message:
        "This property has no valid rate configured. Please contact us and we will quote you directly.",
    };
  }

  // Round to the currency's minor unit so the receipt and the charge agree to
  // the pesewa; floats accumulated over many nights otherwise drift.
  const total = Math.round(nightlyRate * nights * 100) / 100;

  if (total > MAX_AMOUNT) {
    return {
      ok: false,
      status: 400,
      message: "Payment amount exceeds the permitted maximum.",
    };
  }

  return {
    ok: true,
    quote: {
      villaId: villa.id,
      villaTitle: villa.title ?? null,
      rateLabel,
      nightlyRate,
      nights,
      total,
    },
  };
}
