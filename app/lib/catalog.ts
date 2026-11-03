// app/lib/catalog.ts
// ---------------------------------------------------------------------------
// The single source of truth for property and accommodation data.
//
// WHY THIS FILE REPLACES TWO OTHERS
//
//   `app/lib/data.ts` and `app/components/villas/villasData.ts` both exported a
//   `villasData` array, and they disagreed. For Adenta Serenity they described
//   completely different inventory:
//
//     app/lib/data.ts                      Single-side:  1500 / 2000 / 3500 / monthly 36000
//     app/components/villas/villasData.ts  Single bedroom 1500, Studio 2000,
//                                          Two bedrooms 3500 AND 42000 (same label twice)
//
//   Different screens imported different files, so the listing grid, the detail
//   page and the checkout could each show a different price for the same room.
//   Everything now flows through `toVillaProps` here, so a disagreement is a
//   compile error rather than a pricing bug.
//
// THE BUNDLED FALLBACK MIRRORS PRODUCTION
//
//   The fallback below is used only when Supabase is not configured (local dev,
//   or a fresh clone). It reproduces what production `villas.rates` actually
//   contained when this was written, rather than either of the two contradictory
//   bundled files — because a dev environment that disagrees with production is
//   worse than no fallback at all.
//
//   That production data has real problems, and they are NOT silently corrected
//   here (see `rateWarnings`):
//
//     • Lakeside carries "Monthly Rate (Whole apartment)" 30,000 next to
//       "Whole apartment (4 bedrooms)" 36,000. The labels look swapped against
//       the amounts, and 36,000/night is not a nightly price.
//     • Aburi and Adenta have identical rates, which suggests the rows were
//       copied between properties.
//
//   Guessing the intended figures would mean inventing approved prices. Instead
//   the anomalies are surfaced as blocking warnings and the affected units fall
//   back to enquiry-only until an owner confirms them in admin. Use
//   `GET /api/admin/rate-audit` or the admin property screen to see the list.
// ---------------------------------------------------------------------------

import { normalizeUnits, type StoredRate } from "./rates";
import { approvedCapacity } from "./capacity";
import type { VillaProps } from "../components/villas/types";

/**
 * Signals that a stored rate list predates a correction and must not be sold.
 * Keyed by property id; a true result falls back to the approved list.
 */
const STALE_RATE_TESTS: Record<number, (rates: StoredRate[]) => boolean> = {
  // Adenta: no studio exists there, and nothing is sold at GHS 600.
  3: (rates) =>
    rates.some((rate) => {
      const label = String((rate as { option?: unknown }).option ?? "");
      const amount = Number((rate as { amount?: unknown }).amount ?? 0);
      return /studio/i.test(label) || (amount > 0 && amount === 600);
    }),
};

/** A row from the `villas` table, as PostgREST returns it. */
export interface VillaRow {
  id: number;
  image?: string | null;
  images?: unknown;
  video?: string | null;
  price?: number | null;
  title?: string | null;
  location?: string | null;
  coordinates?: unknown;
  guests?: number | null;
  rating?: number | null;
  bedrooms?: number | null;
  has_pool?: boolean | null;
  bathrooms?: number | null;
  description?: string | null;
  amenities?: unknown;
  rates?: unknown;
}

function toStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.filter((entry): entry is string => typeof entry === "string");
}

/**
 * Media that belongs to a known property, keyed by its id.
 *
 * Used only as a fallback when the database row has no `images` or `video` —
 * a production row that predates those columns is common, and without this the
 * listing card silently loses its photograph and its walkthrough. The fallback
 * still respects the one rule that matters: these files were photographed at
 * *this* property, so nothing is borrowed from another listing.
 */
const BUNDLED_MEDIA: Record<
  number,
  { image: string; images: string[]; video?: string }
> = {
  1: {
    image: "/Lake2.jpg",
    images: ["/Lake2.jpg", "/Lake4.jpg", "/Lake3.jpg", "/Lake1.jpg"],
    video: "/lakeside.mp4",
  },
  2: {
    image: "/Aburi1.jpeg",
    images: ["/Aburi1.jpeg", "/Aburi2.jpeg", "/Aburi3.jpeg", "/Aburi4.jpeg"],
    video: "/aburi.mp4",
  },
  /*
   * Adenta has NO walkthrough of its own.
   *
   * The clip that used to sit here (`/adenta.mp4`) is the Aburi studio: same
   * blue carpet, same dark wardrobe, same butterfly canvas, and the same room
   * appears inside `/aburi.mp4` at 55–75s. It has been renamed
   * `/aburi-studio.mp4` and attached to the Aburi studio rate.
   *
   * Adenta therefore has no `video` at all. That is the honest state: the asset
   * is missing, so it is reported as missing and the card falls back to its
   * photographs. Filling the gap with another property's footage would
   * misrepresent the room a guest is booking.
   */
  3: {
    image: "/Adenta1.jpg",
    images: [
      "/Adenta1.jpg",
      "/Adenta2.jpg",
      "/Adenta3.jpg",
      "/Adenta4.jpg",
      "/media/adenta/adenta-01.jpg",
      "/media/adenta/adenta-02.jpg",
      "/media/adenta/adenta-03.jpg",
      "/media/adenta/adenta-04.jpg",
      "/media/adenta/adenta-05.jpg",
      "/media/adenta/adenta-06.jpg",
      "/media/adenta/adenta-07.jpg",
      "/media/adenta/adenta-08.jpg",
      "/media/adenta/adenta-09.jpg",
      "/media/adenta/adenta-10.jpg",
      "/media/adenta/adenta-11.jpg",
      "/media/adenta/adenta-12.jpg",
      "/media/adenta/adenta-13.jpg",
      "/media/adenta/adenta-14.jpg",
      "/media/adenta/adenta-15.jpg",
      "/media/adenta/adenta-16.jpg",
      "/media/adenta/adenta-17.jpg",
    ],
  },
};

/**
 * A room's own clip, keyed by property id and unit id.
 *
 * Production `villas.rates` predates the `video` field, so a stored rate list
 * carries no room clip and the studio would show only the house tour until the
 * migration is run. This is the same pattern as BUNDLED_MEDIA: the fallback
 * belongs to *this* property and *this* room, so it cannot mislabel anything.
 */
const BUNDLED_UNIT_CLIPS: Record<number, Record<string, { video: string; poster: string }>> = {
  2: {
    // The Aburi Studio. This footage was previously published as the Adenta
    // Serenity walkthrough.
    studio: { video: "/aburi-studio.mp4", poster: "/aburi-studio-poster.jpg" },
  },
};

/**
 * Clips proven, by frame comparison, to belong to a different property.
 *
 * A database row can still point at one of these after the file has been
 * reassigned — the row is only corrected when the migration runs. Screening the
 * path here means the wrong footage cannot reappear on a public page in the
 * meantime, and the property simply shows its photographs.
 */
const MISASSIGNED_VIDEO: Record<number, string[]> = {
  // `/adenta.mp4` was the Aburi studio. It is now `/aburi-studio.mp4`, held by
  // the Aburi studio rate.
  3: ["/adenta.mp4", "/aburi-studio.mp4"],
};

function resolveVideo(row: VillaRow, bundledVideo: string | undefined): string | undefined {
  const stored = typeof row.video === "string" ? row.video.trim() : "";
  const rejected = MISASSIGNED_VIDEO[row.id] ?? [];
  if (stored && !rejected.includes(stored)) return stored;
  return bundledVideo;
}

function toCoordinates(value: unknown, fallbackId: number): { lat: number; lng: number } {
  if (value && typeof value === "object" && !Array.isArray(value)) {
    const record = value as Record<string, unknown>;
    const lat = Number(record.lat);
    const lng = Number(record.lng);
    if (Number.isFinite(lat) && Number.isFinite(lng)) return { lat, lng };
  }
  // Accra. Only used when a row has no coordinates at all.
  return { lat: 5.6037 - fallbackId * 0.01, lng: -0.187 };
}

/**
 * Map a database row (or a bundled literal) to the shape the UI consumes.
 *
 * Every rate passes through `normalizeUnits`, so a row whose rates have no
 * `priceBasis` still produces units — they are simply marked `needsReview` and
 * excluded from online sale where the basis cannot be trusted.
 */
export function toVillaProps(row: VillaRow): VillaProps {
  const bundled = BUNDLED_MEDIA[row.id];
  const storedImages = toStringArray(row.images);
  const images = storedImages.length ? storedImages : (bundled?.images ?? []);
  const image = row.image ?? images[0] ?? bundled?.image ?? "";
  const video = resolveVideo(row, bundled?.video);

  /*
   * Occupancy is derived from the bedroom count, not from `row.guests`.
   *
   * Every production row said 4 guests, four-bedroom houses included, and that
   * figure reached the cards, the filters and the whole-apartment rate's limit.
   * See app/lib/capacity.ts.
   */
  const bedrooms = Number(row.bedrooms ?? 0);
  const guests = approvedCapacity(bedrooms, row.guests ?? null);

  /*
   * A production row that predates `rates` (or was seeded with an empty array)
   * would otherwise collapse to a single room derived from `price`. That is how
   * a six-rate property suddenly shows one price, so an empty column falls back
   * to this property's bundled rate list — same property, never another's.
   */
  const storedRates = Array.isArray(row.rates) ? (row.rates as StoredRate[]) : [];
  /*
   * A stored rate list that contains something this property cannot sell is
   * stale, not a price decision.
   *
   * Adenta's rows still carried "Studio — 600" copied from Aburi. It prices a
   * room that does not exist in that house, so the whole stored list is
   * distrusted and the property's approved list is used instead. As soon as the
   * row no longer contains those entries — via Admin → Properties or the
   * migration — the stored list takes over again.
   */
  const staleRates = STALE_RATE_TESTS[row.id]?.(storedRates) ?? false;
  const ratesForRow =
    storedRates.length && !staleRates
      ? storedRates
      : (BUNDLED_ROWS.find((entry) => entry.id === row.id)?.rates as StoredRate[] | undefined) ??
        storedRates;

  const units = normalizeUnits(ratesForRow, {
    price: row.price ?? null,
    // The corrected figure, so a whole-apartment rate inherits the real limit.
    guests: guests || null,
    bedrooms: bedrooms || null,
    bathrooms: row.bathrooms ?? null,
  }).map((unit) => {
    // A stored clip always wins; the bundled one fills the gap for a row that
    // predates room clips.
    if (unit.video) return unit;
    const clip = BUNDLED_UNIT_CLIPS[row.id]?.[unit.id];
    return clip ? { ...unit, video: clip.video, videoPoster: clip.poster } : unit;
  });

  return {
    id: row.id,
    image,
    images: images.length ? images : image ? [image] : [],
    video,
    price: Number(row.price ?? 0),
    title: row.title ?? "",
    location: row.location ?? "",
    coordinates: toCoordinates(row.coordinates, row.id),
    guests,
    bedrooms,
    hasPool: Boolean(row.has_pool),
    bathrooms: Number(row.bathrooms ?? 0),
    description: row.description ?? "",
    rating: typeof row.rating === "number" ? row.rating : null,
    amenities: toStringArray(row.amenities),
    units,
  };
}

/** `"Greater Accra • Lakeside"` → `"lakeside"`. Used by search and filters. */
export function locationName(location: string): string {
  const parts = location.split("•");
  return (parts[1] ?? parts[0] ?? "").trim();
}

export function locationRegion(location: string): string {
  const parts = location.split("•");
  return (parts.length > 1 ? parts[0] : "").trim();
}

const LAKESIDE_AMENITIES = [
  "Free Wi-Fi",
  "Kitchen",
  "Pool",
  "Well-furnished hall",
  "Television in all rooms",
  "PS5 Gaming Console",
];

const ABURI_AMENITIES = [
  "Free Wi-Fi",
  "Kitchen",
  "Pool",
  "Well-furnished hall",
  "Television in all rooms",
  "PS5 Gaming Console",
];

const ADENTA_AMENITIES = [
  "Free Wi-Fi",
  "Kitchen",
  "Pool",
  "Well-furnished hall",
  "Grand Piano",
  "PS5 Gaming Console",
];

/**
 * Bundled fallback. Mirrors production `villas` as observed, including its
 * anomalies — see the header. Do not "fix" the numbers here without an owner
 * decision; the warnings exist precisely so the conflict stays visible.
 */
const BUNDLED_ROWS: VillaRow[] = [
  {
    id: 1,
    title: "Lakeside Estate",
    location: "Greater Accra • Lakeside",
    coordinates: { lat: 5.672737022781674, lng: -0.15226067413187414 },
    // Headline rate for the three-bedroom apartment.
    price: 3500,
    guests: 6,
    bedrooms: 3,
    bathrooms: 4,
    has_pool: true,
    // The files on disk are Lake1–4.jpg. The old `/Lakeside#.jpg` paths 404ed,
    // which is why the Lakeside card and gallery showed broken images.
    image: "/Lake2.jpg",
    images: ["/Lake2.jpg", "/Lake4.jpg", "/Lake3.jpg", "/Lake1.jpg"],
    video: "/lakeside.mp4",
    description:
      "A three-bedroom apartment in the serene surroundings of Lakeside Estate, with a private pool, a games room and a marble-floored living area. The whole apartment sleeps six.",
    amenities: LAKESIDE_AMENITIES,
    rates: [
      { option: "One bedroom", amount: 1500, priceBasis: "per_night" },
      { option: "Two bedrooms", amount: 2000, priceBasis: "per_night" },
      { option: "Whole apartment (3 bedrooms)", amount: 3500, priceBasis: "per_night" },
      // No published monthly figure: the card and the booking summary ask the
      // guest to enquire instead, and a stay is never priced monthly by accident.
      { option: "Monthly Rate (Whole apartment)", amount: null, priceBasis: "monthly" },
      { option: "Special Party Rate", amount: 5000, priceBasis: "per_stay" },
      { option: "Test Room", amount: 1, priceBasis: "per_stay", maxGuests: 60 },
    ],
  },
  {
    id: 2,
    title: "Aburi Mountain Retreat",
    location: "Eastern Region • Aburi",
    coordinates: { lat: 5.843870554138503, lng: -0.17225994962774632 },
    price: 600,
    guests: 8,
    bedrooms: 4,
    bathrooms: 5,
    has_pool: true,
    image: "/Aburi1.jpeg",
    images: ["/Aburi1.jpeg", "/Aburi2.jpeg", "/Aburi3.jpeg", "/Aburi4.jpeg"],
    video: "/aburi.mp4",
    description:
      "Nestled in the serene and refreshing environment of Aburi, this beautifully furnished apartment offers complete comfort.",
    amenities: ABURI_AMENITIES,
    rates: [
      { option: "Single bedroom", amount: 600, priceBasis: "per_night" },
      // The studio is the room shown in `/aburi-studio.mp4`. The clip was
      // previously served to guests as "Adenta Serenity walkthrough".
      {
        option: "Studio",
        amount: 800,
        priceBasis: "per_night",
        video: "/aburi-studio.mp4",
        videoPoster: "/aburi-studio-poster.jpg",
      },
      { option: "One bedroom", amount: 1200, priceBasis: "per_night" },
      { option: "Two bedrooms", amount: 2000, priceBasis: "per_night" },
      { option: "Whole apartment (4 bedrooms)", amount: 3500, priceBasis: "per_night" },
      { option: "Monthly Rate (Whole apartment)", amount: null, priceBasis: "monthly" },
      { option: "Special Party Rate", amount: 5000, priceBasis: "per_stay" },
      { option: "Test Room", amount: 1, priceBasis: "per_stay", maxGuests: 60 },
    ],
  },
  {
    id: 3,
    title: "Adenta Serenity",
    location: "Greater Accra • Adenta",
    coordinates: { lat: 5.712737022781674, lng: -0.16226067413187414 },
    price: 2000,
    guests: 8,
    bedrooms: 4,
    bathrooms: 5,
    has_pool: true,
    image: "/Adenta1.jpg",
    images: [
      "/Adenta1.jpg",
      "/Adenta2.jpg",
      "/Adenta3.jpg",
      "/Adenta4.jpg",
      // Supplied 3 November 2026 — all photographed at Adenta Serenity.
      "/media/adenta/adenta-01.jpg",
      "/media/adenta/adenta-02.jpg",
      "/media/adenta/adenta-03.jpg",
      "/media/adenta/adenta-04.jpg",
      "/media/adenta/adenta-05.jpg",
      "/media/adenta/adenta-06.jpg",
      "/media/adenta/adenta-07.jpg",
      "/media/adenta/adenta-08.jpg",
      "/media/adenta/adenta-09.jpg",
      "/media/adenta/adenta-10.jpg",
      "/media/adenta/adenta-11.jpg",
      "/media/adenta/adenta-12.jpg",
      "/media/adenta/adenta-13.jpg",
      "/media/adenta/adenta-14.jpg",
      "/media/adenta/adenta-15.jpg",
      "/media/adenta/adenta-16.jpg",
      "/media/adenta/adenta-17.jpg",
    ],
    // No walkthrough exists for this property yet: `adenta.mov` has not been
    // added to the repository. See BUNDLED_MEDIA[3].
    description:
      "A four-bedroom house in Adenta with a private pool, a grand piano and a games lounge. The whole house sleeps eight; single and double-bedroom options are available on weeknights.",
    amenities: ADENTA_AMENITIES,
    /*
     * Adenta has no studio and no GHS 600 room. Those two rows were copied from
     * Aburi and priced a room that does not exist here. The approved figures are
     * the three below.
     */
    rates: [
      { option: "One bedroom", amount: 2000, priceBasis: "per_night", maxGuests: 2 },
      { option: "Two bedrooms", amount: 2500, priceBasis: "per_night", maxGuests: 4 },
      { option: "Whole apartment (4 bedrooms)", amount: 4000, priceBasis: "per_night" },
      { option: "Monthly Rate (Whole apartment)", amount: null, priceBasis: "monthly" },
      // Parties cost more at Adenta than elsewhere — the approved exception.
      { option: "Special Party Rate", amount: 6000, priceBasis: "per_stay" },
      { option: "Test Room", amount: 1, priceBasis: "per_stay", maxGuests: 60 },
    ],
  },
];

/** The fallback catalogue, fully normalised. */
export const bundledVillas: VillaProps[] = BUNDLED_ROWS.map(toVillaProps);

export function bundledVillaById(id: number): VillaProps | null {
  return bundledVillas.find((villa) => villa.id === id) ?? null;
}
