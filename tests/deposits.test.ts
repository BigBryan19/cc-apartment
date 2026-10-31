// tests/deposits.test.ts
// ---------------------------------------------------------------------------
// Acceptance tests for the deposit policy and the car-rental day arithmetic.
//
// These are the parts of the update that touch money, so they are tested against
// the real modules rather than reimplemented here. Run with `npm run test:pricing`.
//
// The rules being pinned down:
//   • An unconfigured policy never produces a deposit figure.
//   • A percentage or fixed deposit is capped at the booking total.
//   • A deposit equal to the total is just pay-in-full, not a "0 balance" oddity.
//   • Rental days are the days held, and an invalid range yields no total.
// ---------------------------------------------------------------------------

import {
  NO_DEPOSIT_POLICY,
  balanceDueDateKey,
  depositAmountFor,
  isDepositConfigured,
  clampPercent,
  parseDepositPolicy,
  resolveDue,
} from "../app/lib/deposit";
import { carRentalDays, carRentalTotal, HONEYMOON_FROM, CAR_RENTAL } from "../app/lib/services";
import { normalizeUnits, resolveUnit } from "../app/lib/rates";

let passed = 0;
let failed = 0;

function check(id: string, label: string, condition: boolean, detail?: string) {
  if (condition) {
    passed += 1;
    console.log(`  PASS  [${id}] ${label}`);
  } else {
    failed += 1;
    console.error(`  FAIL  [${id}] ${label}${detail ? ` — ${detail}` : ""}`);
  }
}

const defaultPolicy = parseDepositPolicy(undefined);
const percent30 = parseDepositPolicy({ mode: "percent", percent: 30 });
const fixed1000 = parseDepositPolicy({ mode: "fixed", fixedAmount: 1000 });

// --- 1. Unconfigured -------------------------------------------------------
check("D1", "no policy means no deposit", !isDepositConfigured(NO_DEPOSIT_POLICY));
check(
  "D1",
  "the default policy offers part payment at 30%",
  defaultPolicy.minPercent === 30 && defaultPolicy.enabled,
);
check(
  "D1",
  "requesting a deposit without a policy reports it as unavailable",
  resolveDue(2000, NO_DEPOSIT_POLICY, "deposit").unavailable,
);
check(
  "D1",
  "…and does not invent an amount to charge",
  resolveDue(2000, NO_DEPOSIT_POLICY, "deposit").dueNow === 2000 &&
    resolveDue(2000, NO_DEPOSIT_POLICY, "deposit").deposit === 0,
);

// --- 2. Percentage ---------------------------------------------------------
check(
  "D2",
  "30% of 3,500 is 1,050",
  depositAmountFor(3500, percent30) === 1050,
  String(depositAmountFor(3500, percent30)),
);
const percentDue = resolveDue(3500, percent30, "deposit");
check("D2", "…due now is the deposit", percentDue.dueNow === 1050);
check("D2", "…balance is the remainder", percentDue.balance === 2450);
check("D2", "…and the two add back to the total", percentDue.dueNow + percentDue.balance === 3500);

// --- 3. Fixed --------------------------------------------------------------
const fixedDue = resolveDue(3500, fixed1000, "deposit");
check("D3", "a fixed 1,000 deposit is charged as 1,000", fixedDue.dueNow === 1000);
check("D3", "…leaving 2,500 outstanding", fixedDue.balance === 2500);

// --- 4. Caps and degenerates ----------------------------------------------
check(
  "D4",
  "a fixed deposit larger than the total is capped at the total",
  depositAmountFor(600, parseDepositPolicy({ mode: "fixed", fixedAmount: 5000 })) === 600,
);
check(
  "D4",
  "a deposit equal to the total falls back to pay-in-full",
  resolveDue(1000, parseDepositPolicy({ mode: "fixed", fixedAmount: 1000 }), "deposit")
    .balance === 0 &&
    resolveDue(1000, parseDepositPolicy({ mode: "fixed", fixedAmount: 1000 }), "deposit")
      .deposit === 0,
);

// --- 5. The 30% floor is not negotiable ----------------------------------
check(
  "D5",
  "a stored floor below 30% is raised to 30%",
  parseDepositPolicy({ mode: "percent", percent: 10 }).minPercent === 30,
);
check(
  "D5",
  "a guest choosing 10% is charged 30%",
  clampPercent(10, percent30) === 30,
);
check(
  "D5",
  "a guest choosing 45% is allowed to",
  resolveDue(1000, percent30, "deposit", 45).dueNow === 450,
);
check(
  "D5",
  "a guest choosing more than 100% is capped at the total",
  resolveDue(1000, percent30, "deposit", 150).plan === "full",
);
check(
  "D5",
  "an owner may raise the floor above 30%",
  parseDepositPolicy({ mode: "percent", percent: 60 }).minPercent === 60,
);

// --- 6. Balance due date ---------------------------------------------------
check(
  "D6",
  "a 7-day term counts back from check-in",
  balanceDueDateKey("2026-11-10", parseDepositPolicy({ mode: "percent", percent: 20, balanceDueDays: 7 })) ===
    "2026-11-03",
);
check(
  "D6",
  "no term means no date",
  balanceDueDateKey("2026-11-10", percent30) === null,
);

// --- 7. Car rental ---------------------------------------------------------
check("R1", "three rental days", carRentalDays("2026-11-01", "2026-11-04") === 3);
check("R2", "one rental day", carRentalDays("2026-11-01", "2026-11-02") === 1);
check(
  "R3",
  "an inverted range is not a rental",
  carRentalDays("2026-11-04", "2026-11-01") === 0,
);
check(
  "R4",
  "three days at 1,000 is 3,000",
  carRentalTotal(3) === 3000,
  String(carRentalTotal(3)),
);
check("R5", "a zero-day rental costs nothing", carRentalTotal(0) === 0);
check("R6", "the day rate is the approved one", CAR_RENTAL.dayRate === 1000);
check("R7", "the honeymoon starting price is the approved one", HONEYMOON_FROM === 3500);

// --- 7. Room matching ------------------------------------------------------
//
// The bug this pins down: the property page and the checkout derive unit ids
// from different labels, so a strict id match failed and the code fell back to
// units[0] — quietly charging the cheapest room for every booking.
const aburiRooms = normalizeUnits(
  [
    { option: "Single bedroom", amount: 600, priceBasis: "per_night" },
    { option: "Whole apartment (4 bedrooms)", amount: 3500, priceBasis: "per_night" },
    { option: "Special Party Rate", amount: 5000, priceBasis: "per_stay" },
  ],
  { guests: 4 },
);

const special = aburiRooms.find((unit) => unit.name === "Special Party Rate")!;
check("D7", "an id that exists is honoured", resolveUnit(aburiRooms, special.id, null)?.name === "Special Party Rate");
check("D7", "a stale id still resolves through the name", resolveUnit(aburiRooms, "some-old-id", "Special Party Rate")?.name === "Special Party Rate");
check("D7", "name matching ignores punctuation and case", resolveUnit(aburiRooms, "", "special  party rate")?.name === "Special Party Rate");
check("D7", "an unmatched choice returns null rather than another room", resolveUnit(aburiRooms, "gone", "Garden suite") === null);
check("D7", "no request at all still defaults to the first room", resolveUnit(aburiRooms, "", "")?.name === "Single bedroom");
check("D7", "the default is NOT used when a choice was made", resolveUnit(aburiRooms, "gone", "Garden suite")?.amount !== 600);

console.log("\n" + "-".repeat(60));
console.log(`  ${passed} passed, ${failed} failed`);
console.log("-".repeat(60) + "\n");

if (failed > 0) process.exit(1);
