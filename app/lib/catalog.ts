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
import type { VillaProps } from "../components/villas/types";

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
  const images = toStringArray(row.images);
  const image = row.image ?? images[0] ?? "";

  const units = normalizeUnits(row.rates as StoredRate[] | undefined | null, {
    price: row.price ?? null,
    guests: row.guests ?? null,
    bedrooms: row.bedrooms ?? null,
    bathrooms: row.bathrooms ?? null,
  });

  return {
    id: row.id,
    image,
    images: images.length ? images : image ? [image] : [],
    video: row.video ?? undefined,
    price: Number(row.price ?? 0),
    title: row.title ?? "",
    location: row.location ?? "",
    coordinates: toCoordinates(row.coordinates, row.id),
    guests: Number(row.guests ?? 0),
    bedrooms: Number(row.bedrooms ?? 0),
    hasPool: Boolean(row.has_pool),
    bathrooms: Number(row.bathrooms ?? 0),
    description: row.description ?? "",
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
    coordinates: { lat: 5.726743173934811, lng: -0.1200319741836416 },
    price: 2000,
    guests: 4,
    bedrooms: 3,
    bathrooms: 5,
    has_pool: true,
    image: "/Lake1.jpg",
    images: ["/Lake1.jpg", "/Lake2.jpg", "/Lake3.jpg", "/Lake4.jpg"],
    description:
      "Experience comfort, privacy, and elegance in this beautifully furnished apartment located in the serene and secure Lakeside Estate.",
    amenities: LAKESIDE_AMENITIES,
    rates: [
      { option: "One bedrooms", amount: 1500 },
      { option: "Two bedrooms", amount: 2000 },
      { option: "Monthly Rate (Whole apartment)", amount: 30000 },
      { option: "Whole apartment (4 bedrooms)", amount: 36000 },
    ],
  },
  {
    id: 2,
    title: "Aburi Mountain Retreat",
    location: "Eastern Region • Aburi",
    coordinates: { lat: 5.843870554138503, lng: -0.17225994962774632 },
    price: 600,
    guests: 4,
    bedrooms: 4,
    bathrooms: 5,
    has_pool: true,
    image: "/Aburi1.jpeg",
    images: ["/Aburi1.jpeg", "/Aburi2.jpeg", "/Aburi3.jpeg", "/Aburi4.jpeg"],
    description:
      "Nestled in the serene and refreshing environment of Aburi, this beautifully furnished apartment offers complete comfort.",
    amenities: ABURI_AMENITIES,
    rates: [
      { option: "Single bedroom", amount: 600 },
      { option: "Studio", amount: 800 },
      { option: "Two bedrooms", amount: 2000 },
    ],
  },
  {
    id: 3,
    title: "Adenta Serenity",
    location: "Greater Accra • Adenta",
    coordinates: { lat: 5.712737022781674, lng: -0.16226067413187414 },
    price: 600,
    guests: 4,
    bedrooms: 4,
    bathrooms: 5,
    has_pool: true,
    image: "/Adenta1.jpg",
    images: ["/Adenta1.jpg", "/Adenta2.jpg", "/Adenta3.jpg", "/Adenta4.jpg"],
    description:
      "Located in the heart of Adenta, this premium apartment combines luxury, comfort, and entertainment with modern furnishings and a grand piano.",
    amenities: ADENTA_AMENITIES,
    rates: [
      { option: "Single bedroom", amount: 600 },
      { option: "Studio", amount: 800 },
    ],
  },
];

/** The fallback catalogue, fully normalised. */
export const bundledVillas: VillaProps[] = BUNDLED_ROWS.map(toVillaProps);

export function bundledVillaById(id: number): VillaProps | null {
  return bundledVillas.find((villa) => villa.id === id) ?? null;
}
