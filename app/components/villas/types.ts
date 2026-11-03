import type { AccommodationUnit } from "../../lib/rates";

export interface VillaProps {
  id: number;
  image: string;
  images: string[];
  video?: string;
  /**
   * Headline price in GHS, as stored on the property row.
   *
   * NOT the advertised price. The card badge and the price filter must use
   * `fromNightlyPrice(villa.units)`, which derives the lowest *published nightly*
   * rate. Advertising this field is what made the listing card say GHS 2,000
   * while the detail page offered GHS 1,500.
   */
  price: number;
  title: string;
  location: string;
  coordinates: { lat: number; lng: number };
  /** Approved maximum occupancy for the whole property. */
  guests: number;
  bedrooms: number;
  hasPool: boolean;
  bathrooms: number;
  description: string;
  /** Owner-entered guest rating (0–5). Null falls back to the published 4.9. */
  rating?: number | null;
  amenities?: string[];
  /**
   * The canonical bookable inventory.
   *
   * Replaces the old `rates: { option, amount }[]`, which had no price basis —
   * so every amount was multiplied by nights and a monthly rate was charged as a
   * nightly one. See app/lib/rates.ts.
   */
  units: AccommodationUnit[];
}

export interface SearchFilters {
  location: string;
  /**
   * Region filter, set by the destination cards ("Eastern Region",
   * "Greater Accra"). Kept separate from `location` so the city dropdown in the
   * hero keeps working: its options are Aburi, Lakeside and Adenta, none of which
   * is a region name.
   */
  region?: string;
  guests: number;
  maxPrice: number;
  checkIn?: string;
  checkOut?: string;
}
