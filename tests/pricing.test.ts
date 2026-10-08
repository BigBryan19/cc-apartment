// tests/pricing.test.ts
// ---------------------------------------------------------------------------
// Acceptance tests for the pricing engine and the status model.
//
// Runs against the real modules — app/lib/quote.ts and app/lib/status.ts — not a
// reimplementation, so a regression in either is caught here. Both are pure with
// no directives, which is what makes them testable without a browser, a server
// or a database.
//
// HOW TO RUN
//   npm run test:pricing
//
// These cover the numbered acceptance tests from the brief that are decidable
// from logic alone. The ones that need a live database, a payment provider or a
// browser are listed as outstanding in the report; none of them is claimed as
// passing here.
// ---------------------------------------------------------------------------

import {
  buildQuote,
  priceUnit,
  findUnitsForGuests,
  maxPropertyOccupancy,
  type ExtraInput,
} from "../app/lib/quote";
import { toVillaProps } from "../app/lib/catalog";
import {
  normalizeUnits,
  fromNightlyPrice,
  rateWarnings,
  isEnquiryOnly,
  type AccommodationUnit,
} from "../app/lib/rates";
import {
  overallStatus,
  accommodationOnlyNotice,
  migrateLegacyStatus,
} from "../app/lib/status";

let passed = 0;
let failed = 0;
const failures: string[] = [];

function check(testId: string, description: string, condition: boolean, detail = "") {
  if (condition) {
    passed += 1;
    console.log(`  PASS  [${testId}] ${description}`);
  } else {
    failed += 1;
    failures.push(`[${testId}] ${description}${detail ? ` — ${detail}` : ""}`);
    console.log(`  FAIL  [${testId}] ${description}${detail ? ` — ${detail}` : ""}`);
  }
}

function unit(overrides: Partial<AccommodationUnit> = {}): AccommodationUnit {
  return {
    id: "unit",
    name: "Test unit",
    sourceLabel: "Test unit",
    kind: "room",
    priceBasis: "per_night",
    amount: 500,
    maxGuests: 2,
    bedrooms: 1,
    beds: 1,
    bathrooms: 1,
    kitchen: true,
    pool: null,
    active: true,
    needsReview: false,
    ...overrides,
  };
}

const NIGHTS_3 = { checkIn: "2026-11-01", checkOut: "2026-11-04" };

console.log("\n=== Pricing engine ===\n");

// --- Acceptance 1: a standard accommodation booking totals correctly -------
{
  const result = buildQuote({
    unit: unit({ amount: 1500 }),
    propertyName: "Lakeside Estate",
    nights: 3,
    guests: 2,
  });

  check(
    "1",
    "per_night unit totals amount x nights",
    result.ok && result.quote.total === 4500,
    result.ok ? `got ${result.quote.total}` : result.reason,
  );
  check(
    "1",
    "the accommodation line states the arithmetic",
    result.ok && result.quote.lines[0].detail === "GHS 1,500 x 3 nights",
    result.ok ? `got ${result.quote.lines[0].detail}` : "",
  );
}

// --- Acceptance 7: monthly must never multiply as nightly ------------------
{
  const monthly = unit({
    id: "monthly",
    name: "Whole apartment (monthly)",
    priceBasis: "monthly",
    amount: 30000,
    kind: "whole_property",
    maxGuests: 4,
  });

  const unitResult = priceUnit(monthly, 2, 2);
  check(
    "7",
    "a monthly rate is refused, not charged as 2 x 30,000",
    !unitResult.ok && unitResult.code === "monthly_not_configured",
    unitResult.ok ? `wrongly produced ${unitResult.amount}` : `code=${unitResult.code}`,
  );

  const quoteResult = buildQuote({
    unit: monthly,
    propertyName: "Lakeside Estate",
    nights: 2,
    guests: 2,
  });
  check(
    "7",
    "the quote refuses too, and names the reason",
    !quoteResult.ok && /monthly/i.test(quoteResult.reason),
    quoteResult.ok ? `wrongly produced ${quoteResult.quote.total}` : "",
  );
  check(
    "7",
    "a monthly unit is not offered for online booking",
    isEnquiryOnly(monthly),
  );
}

// --- Basis handling: per_stay, per_person, per_event ----------------------
{
  const perStay = priceUnit(unit({ priceBasis: "per_stay", amount: 2500 }), 5, 2);
  check(
    "9",
    "per_stay ignores the night count",
    perStay.ok && perStay.amount === 2500,
    perStay.ok ? `got ${perStay.amount}` : perStay.reason,
  );

  const perPerson = priceUnit(unit({ priceBasis: "per_person", amount: 300, maxGuests: 10 }), 2, 4);
  check(
    "9",
    "per_person multiplies by guests, not nights",
    perPerson.ok && perPerson.amount === 1200,
    perPerson.ok ? `got ${perPerson.amount}` : perPerson.reason,
  );

  const perEvent = priceUnit(unit({ priceBasis: "per_event", amount: 5000, kind: "whole_property", maxGuests: 40 }), 1, 30);
  check(
    "9",
    "per_event is charged once regardless of nights or guests",
    perEvent.ok && perEvent.amount === 5000,
    perEvent.ok ? `got ${perEvent.amount}` : perEvent.reason,
  );

  const quoteBasis = priceUnit(unit({ priceBasis: "quote", amount: 0 }), 2, 2);
  check(
    "9",
    "a quote-only rate produces no price",
    !quoteBasis.ok && quoteBasis.code === "unit_unpriced",
  );
}

// --- Acceptance 10: checkout must respect the selected unit's capacity -----
{
  const small = unit({ id: "single", name: "Single bedroom", maxGuests: 2, amount: 600 });

  const tooMany = priceUnit(small, 2, 5);
  check(
    "10",
    "a party larger than the unit's capacity is refused",
    !tooMany.ok && tooMany.code === "capacity_exceeded",
    tooMany.ok ? `wrongly allowed` : "",
  );
  check(
    "10",
    "the refusal names the unit's own limit, not the property's",
    !tooMany.ok && /maximum of 2 guests/.test(tooMany.reason) && /single bedroom/i.test(tooMany.reason),
    !tooMany.ok ? tooMany.reason : "",
  );

  const exactly = priceUnit(small, 2, 2);
  check("10", "a party exactly at capacity is allowed", exactly.ok);
}

// --- Acceptance 13: larger parties get a route out, not a capacity bypass --
{
  const units = [
    unit({ id: "a", name: "Single bedroom", maxGuests: 2 }),
    unit({ id: "b", name: "Two bedrooms", maxGuests: 4 }),
  ];
  const { suited, tooSmall } = findUnitsForGuests(units, 6);
  check("13", "a 6-guest search matches nothing", suited.length === 0);
  check("13", "but the smaller units are reported so a next step can be offered", tooSmall.length === 2);
}

// --- Acceptance 2/3: a fixed package is included; an unquoted one is not ---
{
  const fixed = buildQuote({
    unit: unit({ amount: 1500 }),
    propertyName: "Lakeside Estate",
    nights: 2,
    guests: 2,
    package: {
      id: "honeymoon",
      name: "Honeymoon & Romantic Getaway",
      priceBasis: "per_stay",
      amount: 800,
      requiresQuote: false,
      accommodationIncluded: false,
    },
  });

  check(
    "2",
    "a fixed-price package is added to the total",
    fixed.ok && fixed.quote.total === 3800,
    fixed.ok ? `got ${fixed.quote.total}` : fixed.reason,
  );

  const unquoted = buildQuote({
    unit: unit({ amount: 1500 }),
    propertyName: "Lakeside Estate",
    nights: 2,
    guests: 2,
    package: {
      id: "birthday-celebration",
      name: "Birthday Celebration with Guests",
      priceBasis: "per_event",
      amount: 0,
      requiresQuote: true,
      accommodationIncluded: false,
    },
  });

  check(
    "3",
    "an unquoted package contributes nothing to the payable total",
    unquoted.ok && unquoted.quote.total === 3000,
    unquoted.ok ? `got ${unquoted.quote.total}` : unquoted.reason,
  );
  check(
    "3",
    "…and is listed so the guest can see what is outstanding",
    unquoted.ok && unquoted.quote.unpricedItems.includes("Birthday Celebration with Guests"),
  );
  check(
    "3",
    "…and the room subtotal is not presented as the whole cost",
    unquoted.ok &&
      unquoted.quote.accommodationSubtotal === 3000 &&
      unquoted.quote.unpricedItems.length === 1,
  );
}

// --- Unpriced extras: excluded, visible ------------------------------------
{
  const extras: ExtraInput[] = [
    { id: "honeymoon-setup", name: "Honeymoon room setup", amount: null, priceBasis: "per_stay" },
    { id: "airport-pickup", name: "Airport pickup", amount: 250, priceBasis: "per_stay" },
  ];

  const result = buildQuote({
    unit: unit({ amount: 1000 }),
    propertyName: "Adenta Serenity",
    nights: 2,
    guests: 2,
    extras,
  });

  check(
    "3",
    "an unpriced extra is excluded from the total",
    result.ok && result.quote.total === 2250,
    result.ok ? `got ${result.quote.total}` : result.reason,
  );
  check(
    "3",
    "a priced extra is included",
    result.ok && result.quote.extrasSubtotal === 250,
    result.ok ? `got ${result.quote.extrasSubtotal}` : "",
  );
  check(
    "3",
    "the unpriced extra is named",
    result.ok && result.quote.unpricedItems.length === 1 &&
      result.quote.unpricedItems[0] === "Honeymoon room setup",
  );
  check(
    "3",
    "no line marked excluded reaches the payable total",
    result.ok &&
      result.quote.lines
        .filter((line) => line.excludedFromPayable)
        .every((line) => line.amount === 0),
  );
}

// --- Refundable deposits are not revenue -----------------------------------
{
  const result = buildQuote({
    unit: unit({ amount: 1000 }),
    propertyName: "Adenta Serenity",
    nights: 1,
    guests: 2,
    deposit: { amount: 500, description: "Refundable on inspection" },
  });

  check(
    "15",
    "a refundable deposit is excluded from the total",
    result.ok && result.quote.total === 1000,
    result.ok ? `got ${result.quote.total}` : result.reason,
  );
  check(
    "15",
    "…but is reported separately",
    result.ok && result.quote.refundableDeposit === 500,
    result.ok ? `got ${result.quote.refundableDeposit}` : "",
  );
}

// --- Zero is a refusal, not a free stay -----------------------------------
{
  const result = buildQuote({
    unit: unit({ amount: 0 }),
    propertyName: "Adenta Serenity",
    nights: 2,
    guests: 2,
  });
  check(
    "16",
    "a unit with no amount is refused rather than charged as zero",
    !result.ok,
    result.ok ? `wrongly produced ${result.quote.total}` : "",
  );
}

// --- Invalid duration -----------------------------------------------------
{
  const result = buildQuote({
    unit: unit(),
    propertyName: "Lakeside Estate",
    nights: 0,
    guests: 2,
  });
  check("1", "a zero-night stay is refused", !result.ok && result.code === "invalid_duration");
}

console.log("\n=== Data integrity ===\n");

// --- The reported Adenta data conflict is surfaced, not hidden ------------
{
  const units = normalizeUnits([
    { option: "Single bedroom", amount: 1500 },
    { option: "Studio", amount: 2000 },
    { option: "Two bedrooms", amount: 3500 },
    { option: "Two bedrooms", amount: 42000 },
  ]);

  check("7", "both duplicate 'Two bedrooms' entries are kept", units.length === 4);
  check(
    "7",
    "…with distinct ids so neither silently wins",
    new Set(units.map((entry) => entry.id)).size === 4,
  );
  check(
    "7",
    "a figure 15x the cheapest nightly is blocked from online sale",
    rateWarnings(units).some(
      (warning) => warning.severity === "blocker" && /15x/.test(warning.message),
    ),
  );
}

// --- Grammar and basis inference -----------------------------------------
{
  const units = normalizeUnits([
    { option: "One bedrooms", amount: 1500 },
    { option: "Monthly Rate", amount: 36000 },
  ]);

  check("6", "'One bedrooms' is corrected", units[0].name === "One-bedroom apartment");
  check("6", "a nightly rate is inferred as per_night", units[0].priceBasis === "per_night");
  check("6", "a 'Monthly Rate' label is inferred as monthly", units[1].priceBasis === "monthly");
  check(
    "6",
    "anything inferred is flagged for review",
    units[0].needsReview && units[1].needsReview,
  );
}

// --- "From" pricing only from a published nightly rate -------------------
{
  const withMonthly = normalizeUnits([
    { option: "One bedrooms", amount: 1500 },
    { option: "Monthly Rate", amount: 30000 },
  ]);
  const from = fromNightlyPrice(withMonthly);
  check(
    "14",
    "the advertised price comes from the nightly rate, never the monthly one",
    from !== null && from.amount === 1500,
    from ? `got ${from.amount}` : "null",
  );

  const quoteOnly = normalizeUnits([{ option: "Whole apartment", amount: 0 }]);
  check(
    "14",
    "no published nightly rate yields no price, so the card shows Enquire",
    fromNightlyPrice(quoteOnly) === null,
  );
}

console.log("\n=== Status model ===\n");

// --- Acceptance 3: room-only payment must not read as fully confirmed -----
{
  const status = overallStatus({ accommodation: "confirmed", occasion: "requested" });
  check(
    "3",
    "a paid room with an unreviewed occasion is not 'Booking confirmed'",
    status.code === "partially_confirmed" && status.label !== "Booking confirmed",
    `got ${status.code} / ${status.label}`,
  );
  check(
    "3",
    "…and the detail says the occasion is not yet confirmed",
    /not yet confirmed|awaiting/i.test(status.detail),
  );

  const both = overallStatus({ accommodation: "confirmed", occasion: "confirmed" });
  check(
    "3",
    "both tracks confirmed does read as fully confirmed",
    both.code === "confirmed" && both.label === "Booking confirmed",
  );
}

// --- The required pre-payment notice -------------------------------------
{
  check(
    "3",
    "an unquoted occasion triggers the accommodation-only notice before payment",
    accommodationOnlyNotice("requested") !== null &&
      /accommodation only/i.test(accommodationOnlyNotice("requested") as string),
  );
  check(
    "3",
    "the notice is not shown when there is no occasion",
    accommodationOnlyNotice("none") === null,
  );
  check(
    "3",
    "the notice is not shown once the occasion is confirmed",
    accommodationOnlyNotice("confirmed") === null,
  );
}

// --- Legacy rows migrate without inventing a confirmation ----------------
{
  const legacy = migrateLegacyStatus("confirmed", ["Honeymoon Setup"]);
  check(
    "3",
    "a legacy paid row with add-ons becomes confirmed accommodation + requested occasion",
    legacy.accommodation === "confirmed" && legacy.occasion === "requested",
    JSON.stringify(legacy),
  );

  const plain = migrateLegacyStatus("confirmed", []);
  check("3", "a legacy paid row with no add-ons keeps a plain confirmation",
    plain.accommodation === "confirmed" && plain.occasion === "none");

  const pending = migrateLegacyStatus("pending", ["Birthday Decoration"]);
  check("3", "a legacy pending row is not treated as confirmed",
    pending.accommodation === "pending_payment" && pending.occasion === "requested");
}

// ---------------------------------------------------------------------------
// Regression: the production white-screen
//
// The deployed site threw "Cannot read properties of undefined (reading
// 'filter')" because two components built a VillaProps from database rows with
// an object spread and an `as VillaProps` cast. The cast silenced the compiler,
// `units` was never populated, and the first call to fromNightlyPrice(villa.units)
// killed the page. Every producer must go through toVillaProps.
// ---------------------------------------------------------------------------

console.log("\n=== Regression: DB row -> VillaProps ===\n");
{
  // Shaped exactly like a row from the production `villas` table.
  const productionRow = {
    id: 1,
    title: "Lakeside Estate",
    location: "Greater Accra • Lakeside",
    price: 2000,
    guests: 4,
    bedrooms: 3,
    bathrooms: 5,
    has_pool: true,
    image: "/Lake1.jpg",
    images: ["/Lake1.jpg", "/Lake2.jpg"],
    amenities: ["Free Wi-Fi"],
    coordinates: { lat: 5.7, lng: -0.12 },
    rates: [
      { option: "One bedrooms", amount: 1500 },
      { option: "Monthly Rate (Whole apartment)", amount: 30000 },
    ],
  };

  const villa = toVillaProps(productionRow);

  check(
    "R1",
    "toVillaProps populates units from the rates column",
    Array.isArray(villa.units) && villa.units.length === 2,
    `got ${JSON.stringify(villa.units?.length)}`,
  );
  check(
    "R1",
    "…and the mapped result is directly usable by the listing card",
    fromNightlyPrice(villa.units)?.amount === 1500,
  );
  check("R1", "…and hasPool is mapped from has_pool", villa.hasPool === true);

  // The exact failure mode. Before the fix these threw a TypeError and took the
  // whole page down; now a caller that forgets toVillaProps degrades instead.
  // A villa built the way the broken code built it: no units at all.
  const missingUnits = undefined as unknown as AccommodationUnit[];
  check(
    "R2",
    "fromNightlyPrice tolerates a missing units array instead of throwing",
    fromNightlyPrice(missingUnits) === null,
  );
  check(
    "R2",
    "maxPropertyOccupancy tolerates it too",
    maxPropertyOccupancy(missingUnits) === null,
  );
  check(
    "R2",
    "and a filter falls back to the property's own occupancy rather than crashing",
    (maxPropertyOccupancy(missingUnits) ?? 4) === 4,
  );
  check(
    "R2",
    "rateWarnings tolerates it as well",
    rateWarnings(missingUnits).length === 0,
  );
}

// --- Summary -----------------------------------------------------------------
console.log(`\n${"-".repeat(60)}`);
console.log(`  ${passed} passed, ${failed} failed`);
if (failures.length) {
  console.log("\n  Failures:");
  for (const failure of failures) console.log(`    ${failure}`);
}
console.log(`${"-".repeat(60)}\n`);

process.exit(failed === 0 ? 0 : 1);
