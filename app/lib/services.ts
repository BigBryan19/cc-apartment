// app/lib/services.ts
// ---------------------------------------------------------------------------
// The experiences and services offered alongside a stay.
//
// ONE SOURCE OF TRUTH
//
//   The same four services appear on the home page and on /packages. They used
//   to be hard-coded twice with different prices and images, which is how the
//   honeymoon card ended up advertising "From GHS 500" while nothing in the
//   booking engine could charge it. Everything now reads from this file.
//
// PRICES HERE ARE THE APPROVED ONES
//
//   • Honeymoon  — from GHS 3,500 per stay (client instruction).
//   • Car rental — GHS 1,000 per day for a Hyundai Tucson, charged by the
//                  number of rental days selected.
//   • Birthday   — from GHS 5,000, unchanged.
//   • Massage    — no approved price, so the card says "Enquire for pricing"
//                  and never invents a figure.
//   • Private    — no approved price yet either. A chef is arranged per stay and
//     chef         is NOT part of the room rate, which the card states plainly.
//
//   The two priced services are also present in app/lib/extras.ts so that a
//   guest who adds them at checkout is charged the same amount the card
//   advertises. A card price that the booking engine cannot reproduce is the
//   defect this pairing prevents.
// ---------------------------------------------------------------------------

import { nightsBetween } from "./dates";
import { whatsappLink } from "./contact";

export type ServiceId = "honeymoon" | "birthday" | "car-rental" | "massage" | "private-chef";

/** How the advertised figure is applied. */
export type ServicePriceBasis = "per_stay" | "per_day";

export interface ServicePrice {
  /** Major units, GHS. */
  amount: number;
  basis: ServicePriceBasis;
  /** True when the figure is a starting point rather than a fixed charge. */
  from: boolean;
}

export interface ServiceDefinition {
  id: ServiceId;
  name: string;
  tagline: string;
  description: string;
  image: string;
  imageAlt: string;
  /**
   * Short clip shown instead of the still, as the card's first view.
   * Muted, looped and inline; the still stays as its poster so the card is never
   * blank while the clip buffers or when autoplay is refused.
   */
  video?: string;
  /** Null means "enquire for pricing" — never a placeholder number. */
  price: ServicePrice | null;
  /** How the price is printed on the card and everywhere else. */
  priceLabel: string;
  priceNote: string;
  ctaLabel: string;
  /** Where the enquiry button goes. */
  href: string;
}

/** The approved rental vehicle and its daily rate. */
export const CAR_RENTAL = {
  vehicle: "Hyundai Tucson",
  dayRate: 1000,
  currency: "GHS",
} as const;

/** Honeymoon starting price, per stay. */
export const HONEYMOON_FROM = 3500;

/**
 * Chargeable rental days for a pickup/return pair.
 *
 * Rental days are counted the way the vehicle is actually held: a pickup on
 * Friday and a return on Sunday is two chargeable days. Returns 0 for an
 * invalid or non-positive range so the caller can show a validation message
 * instead of a price for zero days.
 */
export function carRentalDays(pickupKey: string, returnKey: string): number {
  return nightsBetween(pickupKey, returnKey);
}

/** Rental total in GHS for a day count. Never negative. */
export function carRentalTotal(days: number): number {
  if (!Number.isFinite(days) || days <= 0) return 0;
  return Math.round(days * CAR_RENTAL.dayRate * 100) / 100;
}

/** "GHS 3,500" — one formatter so every surface prints the same string. */
export function formatGhs(amount: number): string {
  return `GHS ${amount.toLocaleString(undefined, {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  })}`;
}

/** Advertised price line, e.g. "From GHS 3,500 per stay". */
function priceLabelFor(price: ServicePrice | null): string {
  if (!price) return "Enquire for pricing";
  const suffix = price.basis === "per_day" ? "per day" : "per stay";
  return `${price.from ? "From " : ""}${formatGhs(price.amount)} ${suffix}`;
}

const HONEYMOON: ServiceDefinition = {
  id: "honeymoon",
  name: "Honeymoon & Couples",
  tagline: "A suite staged for two",
  description:
    "The apartment prepared before you arrive — soft lighting, dressed bed and a quiet, private setting for two.",
  // A Cosy Crest bedroom, not a stock exterior: the setup happens in this room.
  image: "/media/services/honeymoon.jpg",
  imageAlt: "A couple sharing a glass of wine at a candlelit table",
  price: { amount: HONEYMOON_FROM, basis: "per_stay", from: true },
  priceLabel: priceLabelFor({ amount: HONEYMOON_FROM, basis: "per_stay", from: true }),
  priceNote: "Starting price per stay. The final figure depends on the property and the setup you choose.",
  ctaLabel: "Enquire on WhatsApp",
  href: whatsappLink(
    "Hello Cosy Crest — I'd like to arrange the Honeymoon & Couples setup. Please tell me what is available from GHS 3,500 per stay.",
  ),
};

const BIRTHDAY: ServiceDefinition = {
  id: "birthday",
  name: "Birthday Celebrations",
  tagline: "Room setup or hosted party",
  description:
    "An overnight stay with the room dressed for a birthday, or a hosted celebration with invited guests at one of our properties.",
  image: "/media/birthday-service.jpg",
  imageAlt: "Birthday table dressed in pink with place settings and a cake",
  video: "/media/birthday-table.mp4",
  price: { amount: 5000, basis: "per_stay", from: true },
  priceLabel: priceLabelFor({ amount: 5000, basis: "per_stay", from: true }),
  priceNote: "Starting price. A hosted party with guests is quoted per event.",
  ctaLabel: "Enquire on WhatsApp",
  href: whatsappLink(
    "Hello Cosy Crest — I'd like to plan a Birthday Celebration. Please send me the options from GHS 5,000.",
  ),
};

const CAR_RENTAL_SERVICE: ServiceDefinition = {
  id: "car-rental",
  name: "Car Rental",
  tagline: CAR_RENTAL.vehicle,
  description:
    "A Hyundai Tucson with a driver available for the length of your stay — airport runs, meetings or a day out of the city.",
  // Freely licensed photograph of the actual model offered.
  image: "/media/services/car-rental.jpg",
  imageAlt: `${CAR_RENTAL.vehicle} available for rental`,
  price: { amount: CAR_RENTAL.dayRate, basis: "per_day", from: false },
  priceLabel: priceLabelFor({ amount: CAR_RENTAL.dayRate, basis: "per_day", from: false }),
  priceNote: "Charged per rental day. Choose your pickup and return dates to see the total.",
  ctaLabel: "Enquire on WhatsApp",
  href: whatsappLink(
    `Hello Cosy Crest — I'd like to rent the ${CAR_RENTAL.vehicle} at GHS 1,000 per day. Please confirm availability.`,
  ),
};

const MASSAGE: ServiceDefinition = {
  id: "massage",
  name: "Massage Services",
  tagline: "In-suite treatments",
  description:
    "A therapist comes to your apartment for a relaxation or deep-tissue massage. Available for individuals and couples.",
  // The pool setup: treatment table laid with towels, water directly behind.
  // Poster is a frame from the same clip, so the still and the video match.
  image: "/media/massage-pool-poster.jpg",
  imageAlt: "Massage table laid with towels beside the pool",
  video: "/media/massage-pool.mp4",
  // No approved price: the card must not imply one.
  price: null,
  priceLabel: "Enquire for pricing",
  priceNote: "Pricing depends on the treatment and the number of guests. We confirm it before you book.",
  ctaLabel: "Enquire on WhatsApp",
  href: whatsappLink(
    "Hello Cosy Crest — I'd like to ask about Massage Services during my stay. Please send me the treatments and pricing.",
  ),
};

/**
 * Private chef.
 *
 * Unpriced on purpose: nothing has been approved for menus or per-head cost, so
 * the card says "Enquire for pricing" and the WhatsApp message asks for both.
 * The photograph is the open kitchen at Aburi Mountain Retreat — a real Cosy
 * Crest room, not a stock chef scene, and the note under the price states that a
 * chef is arranged separately rather than included, so no one books expecting it
 * to be part of the room rate.
 */
const PRIVATE_CHEF: ServiceDefinition = {
  id: "private-chef",
  name: "Private Chef",
  tagline: "Dining in",
  description:
    "Enjoy a personalised dining experience with a private chef during your stay. Enquire about menus and availability.",
  image: "/media/services/private-chef.jpg",
  imageAlt: "A private chef plating a meal in the apartment kitchen",
  // No approved price: the card must not imply one.
  price: null,
  priceLabel: "Enquire for pricing",
  priceNote:
    "Arranged per stay and not included in the room rate. Tell us your dates and we confirm menus, availability and cost.",
  ctaLabel: "Enquire on WhatsApp",
  href: whatsappLink(
    "Hello Cosy Crest — I'd like to ask about a Private Chef during my stay. Please send me menus, availability and pricing.",
  ),
};

export const SERVICES: ServiceDefinition[] = [
  HONEYMOON,
  BIRTHDAY,
  CAR_RENTAL_SERVICE,
  MASSAGE,
  PRIVATE_CHEF,
];

export function getService(id: ServiceId): ServiceDefinition {
  return SERVICES.find((service) => service.id === id) ?? HONEYMOON;
}

/**
 * A prefilled WhatsApp message that names the chosen service and, when the
 * guest has already picked dates, the duration and estimated total.
 *
 * Only ever builds a URL — nothing is sent without the guest tapping it.
 */
export function serviceEnquiryHref(
  id: ServiceId,
  details?: { pickup?: string; return?: string },
): string {
  const service = getService(id);
  if (id !== "car-rental" || !details?.pickup || !details?.return) {
    return service.href;
  }

  const days = carRentalDays(details.pickup, details.return);
  if (days <= 0) return service.href;

  const total = carRentalTotal(days);
  const message =
    `Hello Cosy Crest — I'd like to rent the ${CAR_RENTAL.vehicle}. ` +
    `Pickup ${details.pickup}, return ${details.return} ` +
    `(${days} day${days === 1 ? "" : "s"}, estimated ${formatGhs(total)}). ` +
    `Please confirm availability.`;
  return whatsappLink(message);
}
