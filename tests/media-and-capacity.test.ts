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
import { maxPropertyOccupancy } from "../app/lib/quote";
import { SERVICES } from "../app/lib/services";
import { DEFAULT_GALLERY } from "../app/lib/gallery";

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

// --- 3. Services -----------------------------------------------------------

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
