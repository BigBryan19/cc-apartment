// tests/media-and-capacity.test.ts
// ---------------------------------------------------------------------------
// Acceptance tests for occupancy and media ownership.
//
// The two defects these pin down, both reported by the owner:
//
//   • Every property advertised 4 guests, four-bedroom houses included, so an
//     eight-guest house refused a party of five at checkout.
//   • The clip shown as the "Adenta Serenity walkthrough" was the Aburi studio.
//
// Where a rule is stated by the business it is tested as a rule (3 bedrooms = 6,
// 4 bedrooms = 8), and where the business stated nothing the recorded figure is
// tested to survive untouched.
// ---------------------------------------------------------------------------

import { toVillaProps, bundledVillas, bundledVillaById } from "../app/lib/catalog";
import { approvedCapacity, capacityIsApprovedByRule } from "../app/lib/capacity";
import { normalizeUnits } from "../app/lib/rates";
import { maxPropertyOccupancy, priceUnit } from "../app/lib/quote";
import { SERVICES } from "../app/lib/services";
import { DEFAULT_GALLERY } from "../app/lib/gallery";
import { stayIncludesWeekendNight, weekendAllowsUnit } from "../app/lib/weekend";

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

function villaRow(overrides: Record<string, unknown> = {}) {
  return {
    id: 99,
    title: "Test villa",
    location: "Greater Accra • Test",
    price: 1000,
    guests: 4,
    bedrooms: 4,
    bathrooms: 3,
    has_pool: true,
    image: "/Lake1.jpg",
    images: ["/Lake1.jpg"],
    amenities: [],
    coordinates: { lat: 5.6, lng: -0.1 },
    rates: [{ option: "Whole apartment (4 bedrooms)", amount: 3500, priceBasis: "per_night" }],
    ...overrides,
  };
}

// --- 1. Occupancy ----------------------------------------------------------

console.log("\n=== Occupancy ===\n");

check(
  "C1",
  "a four-bedroom house takes 8 guests even when the row still says 4",
  toVillaProps(villaRow({ bedrooms: 4, guests: 4 }) as never).guests === 8,
);
check(
  "C2",
  "a three-bedroom house takes 6 guests even when the row still says 4",
  toVillaProps(villaRow({ bedrooms: 3, guests: 4 }) as never).guests === 6,
);
check(
  "C3",
  "a bedroom count with no rule keeps its own recorded capacity",
  toVillaProps(villaRow({ bedrooms: 2, guests: 3 }) as never).guests === 3,
);
check(
  "C4",
  "one property's capacity is not applied to every villa",
  approvedCapacity(3, 99) !== approvedCapacity(4, 99),
);
check("C5", "only the stated bedroom counts are governed by the rule", capacityIsApprovedByRule(3) === true && capacityIsApprovedByRule(4) === true && capacityIsApprovedByRule(2) === false && capacityIsApprovedByRule(5) === false);

// The whole-house rate must inherit the property's limit, not a stale 4.
{
  const units = normalizeUnits(
    [{ option: "Whole apartment (4 bedrooms)", amount: 3500, priceBasis: "per_night", maxGuests: 4 }],
    { guests: 8, bedrooms: 4 },
  );
  check(
    "C6",
    "a whole-property rate takes the property capacity, not its old maxGuests",
    units[0].maxGuests === 8,
    String(units[0].maxGuests),
  );
}
{
  // A single room keeps its own smaller limit — that is real information.
  const units = normalizeUnits(
    [{ option: "Single bedroom", amount: 600, priceBasis: "per_night", maxGuests: 2 }],
    { guests: 8, bedrooms: 4 },
  );
  check("C7", "a room rate keeps its own smaller limit", units[0].maxGuests === 2);
}
{
  const units = normalizeUnits([{ option: "One bedroom", amount: 1500, priceBasis: "per_night" }], {
    guests: 6,
    bedrooms: 3,
  });
  check(
    "C8",
    "the injected Test Room does not inflate the advertised capacity",
    maxPropertyOccupancy(units) === null || maxPropertyOccupancy(units)! < 60,
    String(maxPropertyOccupancy(units)),
  );
}

// Every bundled property must be internally consistent after the correction.
{
  const expected: Record<number, number> = { 1: 6, 2: 8, 3: 8 };
  const wrong = bundledVillas.filter((villa) => villa.guests !== expected[villa.id]);
  check(
    "C9",
    "Lakeside 6, Aburi 8, Adenta 8",
    wrong.length === 0,
    wrong.map((villa) => `${villa.title}=${villa.guests}`).join(", "),
  );
}

// Booking validation must accept the group the corrected capacity allows.
{
  const aburi = bundledVillaById(2)!;
  const wholeHouse = aburi.units.find((unit) => unit.kind === "whole_property")!;
  const five = priceUnit(wholeHouse, 2, 5);
  check("C10", "a party of five can book the four-bedroom house", five.ok === true);
  check(
    "C11",
    "and is charged the published nightly rate, not a made-up one",
    five.ok === true && five.amount === wholeHouse.amount * 2,
  );
  const nine = priceUnit(wholeHouse, 2, 9);
  check("C12", "a party of nine is still refused", nine.ok === false);
}
{
  const lakeside = bundledVillaById(1)!;
  const wholeHouse = lakeside.units.find((unit) => unit.kind === "whole_property")!;
  check(
    "C13",
    "the three-bedroom house accepts six and refuses seven",
    priceUnit(wholeHouse, 2, 6).ok === true && priceUnit(wholeHouse, 2, 7).ok === false,
  );
}

// --- 2. Media ownership ----------------------------------------------------

console.log("\n=== Media ownership ===\n");

check(
  "M1",
  "Adenta does not serve the Aburi studio clip",
  !bundledVillaById(3)?.video,
  String(bundledVillaById(3)?.video),
);
check(
  "M2",
  "a stale Adenta row pointing at the studio clip is refused",
  toVillaProps(
    villaRow({ id: 3, title: "Adenta Serenity", bedrooms: 4, video: "/adenta.mp4" }) as never,
  ).video === undefined,
);
check(
  "M3",
  "Adenta still shows real media — the photographs are untouched",
  (bundledVillaById(3)?.images.length ?? 0) >= 4,
);
check(
  "M4",
  "the Aburi studio rate carries the studio clip",
  bundledVillas
    .find((villa) => villa.id === 2)!
    .units.some((unit) => unit.name === "Studio" && unit.video === "/aburi-studio.mp4"),
);
check(
  "M5",
  "no two properties share a walkthrough",
  new Set(bundledVillas.map((villa) => villa.video).filter(Boolean)).size ===
    bundledVillas.map((villa) => villa.video).filter(Boolean).length,
);
check(
  "M6",
  "the gallery no longer credits the studio clip to Adenta",
  DEFAULT_GALLERY.every((item) => item.src !== "/adenta.mp4"),
);
check(
  "M7",
  "the gallery still lists the studio clip, under Aburi",
  DEFAULT_GALLERY.some((item) => item.src === "/aburi-studio.mp4" && item.villaId === 2),
);

// A production-shaped row: rates stored before room clips existed, and a guests
// column that still says 4. Neither may lose the studio clip or the capacity.
{
  const productionAburi = toVillaProps({
    id: 2,
    title: "Aburi Mountain Retreat",
    location: "Eastern Region • Aburi",
    price: 600,
    guests: 4,
    bedrooms: 4,
    bathrooms: 5,
    has_pool: true,
    image: "/Aburi1.jpeg",
    images: ["/Aburi1.jpeg"],
    video: "/aburi.mp4",
    amenities: [],
    coordinates: { lat: 5.84, lng: -0.17 },
    rates: [
      { option: "Single bedroom", amount: 600, priceBasis: "per_night" },
      { option: "Studio", amount: 800, priceBasis: "per_night" },
      { option: "Whole apartment (4 bedrooms)", amount: 3500, priceBasis: "per_night", maxGuests: 4 },
    ],
  } as never);

  check(
    "M8",
    "a row written before room clips still shows the Aburi studio clip",
    productionAburi.units.find((unit) => unit.name === "Studio")?.video === "/aburi-studio.mp4",
  );
  check("M9", "that row now advertises 8 guests", productionAburi.guests === 8);
  check(
    "M10",
    "its whole-house rate accepts 8, not the stored 4",
    productionAburi.units.find((unit) => unit.kind === "whole_property")?.maxGuests === 8,
  );
}

// --- 3. Adenta rates, monthly and weekend ---------------------------------

console.log("\n=== Adenta and weekends ===\n");

{
  const adenta = bundledVillaById(3)!;
  const byId = (needle: string) => adenta.units.find((unit) => unit.id.includes(needle));
  check("A1", "1 bedroom is GHS 2,000", byId("one-bedroom")?.amount === 2000, String(byId("one-bedroom")?.amount));
  check("A2", "2 bedrooms are GHS 2,500", byId("two-bedrooms")?.amount === 2500);
  check("A3", "the entire house is GHS 4,000", byId("whole-apartment")?.amount === 4000);
  check("A4", "there is no studio", !adenta.units.some((unit) => unit.id.includes("studio")));
  check("A5", "there is no GHS 600 room", !adenta.units.some((unit) => unit.amount === 600));
  check("A6", "the Adenta party rate is GHS 6,000", adenta.units.find((u) => u.name.includes("Party"))?.amount === 6000);
  check("A7", "no villa prices a monthly stay", bundledVillas.every((villa) => villa.units.every((unit) => unit.priceBasis !== "monthly" || unit.amount === 0 || unit.amount === null)));
  const lakeside = bundledVillaById(1)!;
  check("A8", "Lakeside is the three-bedroom at 3,500", lakeside.bedrooms === 3 && lakeside.price === 3500 && lakeside.guests === 6);
}

{
  // 2026-11-06 is a Friday, 2026-11-07 a Saturday, 2026-11-09 a Monday.
  const adenta = bundledVillaById(3)!;
  const oneBed = adenta.units.find((unit) => unit.id === "one-bedroom")!;
  const whole = adenta.units.find((unit) => unit.kind === "whole_property")!;

  check("W1", "a Friday night counts as a weekend night", stayIncludesWeekendNight("2026-11-06", "2026-11-08"));
  check("W2", "a Monday-to-Wednesday stay does not", !stayIncludesWeekendNight("2026-11-09", "2026-11-11"));
  check(
    "W3",
    "a weekday arrival that reaches Friday is still restricted",
    !weekendAllowsUnit(3, oneBed, "2026-11-04", "2026-11-07"),
  );
  check("W4", "the whole house is always allowed", weekendAllowsUnit(3, whole, "2026-11-06", "2026-11-08"));
  check("W5", "weeknights still allow a partial house", weekendAllowsUnit(3, oneBed, "2026-11-09", "2026-11-11"));

  const lakeside = bundledVillaById(1)!;
  const lakeRoom = lakeside.units.find((unit) => unit.id === "one-bedroom")!;
  check("W6", "the rule applies to Adenta only", weekendAllowsUnit(1, lakeRoom, "2026-11-06", "2026-11-08"));
}

// A production row still carrying the copied Studio row must not sell it.
{
  const stale = toVillaProps({
    id: 3,
    title: "Adenta Serenity",
    location: "Greater Accra • Adenta",
    price: 600,
    guests: 4,
    bedrooms: 4,
    bathrooms: 5,
    has_pool: true,
    image: "/Adenta1.jpg",
    images: ["/Adenta1.jpg"],
    amenities: [],
    coordinates: { lat: 5.7, lng: -0.16 },
    rates: [
      { option: "Single bedroom", amount: 600, priceBasis: "per_night" },
      { option: "Studio", amount: 800, priceBasis: "per_night" },
      { option: "Whole apartment (4 bedrooms)", amount: 3500, priceBasis: "per_night" },
    ],
  } as never);
  check("A9", "a stale Adenta rate list is not sold", !stale.units.some((unit) => unit.amount === 600));
  check("A10", "the approved list replaces it", stale.units.some((unit) => unit.amount === 2000));
}

// --- 4. Services -----------------------------------------------------------

console.log("\n=== Services ===\n");

{
  const chef = SERVICES.find((service) => service.id === "private-chef");
  check("S1", "Private Chef is offered", Boolean(chef));
  check(
    "S2",
    "Private Chef has no invented price",
    Boolean(chef) && chef!.price === null && chef!.priceLabel === "Enquire for pricing",
  );
  check(
    "S3",
    "Private Chef links to a prefilled WhatsApp enquiry",
    Boolean(chef) && /wa\.me|whatsapp/i.test(chef!.href) && /private%20chef|Private%20Chef/i.test(chef!.href),
  );
  check(
    "S4",
    "Private Chef says it is not part of the room rate",
    Boolean(chef) && /not included/i.test(chef!.priceNote),
  );
  check(
    "S5",
    "no service advertises a gym",
    SERVICES.every((service) => !/gym|fitness/i.test(`${service.name} ${service.description}`)),
  );
}

console.log("\n" + "-".repeat(60));
console.log(`  ${passed} passed, ${failed} failed`);
console.log("-".repeat(60) + "\n");

if (failed > 0) process.exit(1);
