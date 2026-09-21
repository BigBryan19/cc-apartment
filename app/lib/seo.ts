// app/lib/seo.ts
// ---------------------------------------------------------------------------
// Single source of truth for the brand's public identity and the structured
// data search engines read.
//
// Everything here feeds JSON-LD, which is how Google, Bing and the AI answer
// engines learn who the business is, where it operates and what it sells. Keep
// the values below consistent with the footer and the receipt, or the signals
// contradict each other.
// ---------------------------------------------------------------------------

import type { VillaProps } from "../components/villas/types";

/**
 * Canonical origin for the whole site.
 *
 * NEXT_PUBLIC_SITE_URL wins. The literal below is only a safety net for a
 * deployment that forgot to set it — and it must match the host the site is
 * actually served from, because it becomes the canonical URL on every page.
 *
 * Pick ONE of apex or www and make the other 301 to it in Vercel. Serving both
 * splits the site into two competing copies of itself, which is worse than
 * either choice on its own.
 */
export const SITE_URL = (
  process.env.NEXT_PUBLIC_SITE_URL || "https://cosycrest.com"
).replace(/\/$/, "");

export const SITE = {
  name: "Cosy Crest Apartments",
  shortName: "Cosy Crest",
  legalName: "Cosy Crest Apartments",
  tagline: "Luxury furnished apartments in Accra and Aburi, Ghana",
  description:
    "Fully furnished, privately managed apartments in Greater Accra and the Eastern Region of Ghana. Private pools, fast Wi-Fi, secure parking and hotel-grade housekeeping — ideal for holidays, honeymoons and work trips.",
  phone: "+233 54 053 4870",
  phoneE164: "+233540534870",
  email: "officialcosycrestaparts@gmail.com",
  street: "Lakeside Estate",
  city: "Accra",
  region: "Greater Accra",
  country: "GH",
  countryName: "Ghana",
  // Approximate centre of the Lakeside Estate cluster. Individual properties
  // carry their own coordinates from app/lib/data.ts.
  geo: { latitude: 5.726743173934811, longitude: -0.1200319741836416 },
  currency: "GHS",
  areaServed: ["Accra", "Adenta", "Aburi", "Greater Accra", "Eastern Region"],
} as const;

/** Absolute URL for a path or an already-absolute URL. */
export function absoluteUrl(pathOrUrl: string): string {
  if (/^https?:\/\//i.test(pathOrUrl)) return pathOrUrl;
  return `${SITE_URL}${pathOrUrl.startsWith("/") ? "" : "/"}${pathOrUrl}`;
}

/**
 * The business itself.
 *
 * Typed as LodgingBusiness (a schema.org Organisation subtype) rather than a
 * bare Organization, because it carries address, geo and price range — the
 * fields that make a business eligible for local and map results.
 *
 * NOTE: deliberately no `aggregateRating`. The 4.9 shown on the cards is a
 * hardcoded string in the UI, not a real collected rating. Publishing invented
 * review data in structured data breaches Google's guidelines and risks a
 * manual action, which is a far worse outcome than not showing stars.
 */
export function organizationJsonLd() {
  return {
    "@context": "https://schema.org",
    "@type": "LodgingBusiness",
    "@id": `${SITE_URL}/#organization`,
    name: SITE.name,
    legalName: SITE.legalName,
    url: SITE_URL,
    description: SITE.description,
    telephone: SITE.phoneE164,
    email: SITE.email,
    priceRange: "GH₵600 - GH₵3,500 per night",
    currenciesAccepted: SITE.currency,
    paymentAccepted: "Card, Mobile Money",
    image: absoluteUrl("/hero-bg.png"),
    logo: absoluteUrl("/cc-real.png"),
    address: {
      "@type": "PostalAddress",
      streetAddress: SITE.street,
      addressLocality: SITE.city,
      addressRegion: SITE.region,
      addressCountry: SITE.country,
    },
    geo: {
      "@type": "GeoCoordinates",
      latitude: SITE.geo.latitude,
      longitude: SITE.geo.longitude,
    },
    areaServed: SITE.areaServed.map((name) => ({
      "@type": "AdministrativeArea",
      name,
    })),
    amenityFeature: [
      "Private pool",
      "Free Wi-Fi",
      "Secure parking",
      "Air conditioning",
      "Fully equipped kitchen",
      "24/7 security",
    ].map((name) => ({
      "@type": "LocationFeatureSpecification",
      name,
      value: true,
    })),
  };
}

/** The website itself, tied back to the organisation. */
export function websiteJsonLd() {
  return {
    "@context": "https://schema.org",
    "@type": "WebSite",
    "@id": `${SITE_URL}/#website`,
    url: SITE_URL,
    name: SITE.name,
    description: SITE.description,
    inLanguage: "en",
    publisher: { "@id": `${SITE_URL}/#organization` },
  };
}

/**
 * One apartment, as a bookable offer.
 *
 * `Offer` with a real `price` and `priceCurrency` is what makes the property
 * eligible for price display in results. Omitting `availability` on purpose:
 * it changes per date, and a stale value is worse than none.
 */
export function villaJsonLd(villa: VillaProps) {
  const url = `${SITE_URL}/villas/${villa.id}`;
  const images = (villa.images?.length ? villa.images : [villa.image]).map(
    absoluteUrl,
  );

  const amenities = [...(villa.amenities ?? [])];
  if (villa.hasPool && !amenities.includes("Private pool")) {
    amenities.push("Private pool");
  }

  return {
    "@context": "https://schema.org",
    "@type": "Apartment",
    "@id": `${url}/#apartment`,
    name: villa.title,
    description: villa.description,
    url,
    image: images,
    address: {
      "@type": "PostalAddress",
      addressLocality: villa.location,
      addressRegion: SITE.region,
      addressCountry: SITE.country,
    },
    ...(villa.coordinates
      ? {
          geo: {
            "@type": "GeoCoordinates",
            latitude: villa.coordinates.lat,
            longitude: villa.coordinates.lng,
          },
        }
      : {}),
    numberOfRooms: villa.bedrooms,
    occupancy: {
      "@type": "QuantitativeValue",
      maxValue: villa.guests,
      unitText: "guests",
    },
    numberOfBathroomsTotal: villa.bathrooms,
    amenityFeature: amenities.map((name) => ({
      "@type": "LocationFeatureSpecification",
      name,
      value: true,
    })),
    provider: { "@id": `${SITE_URL}/#organization` },
    offers: {
      "@type": "Offer",
      url,
      price: villa.price,
      priceCurrency: SITE.currency,
      businessFunction: "http://purl.org/goodrelations/v1#LeaseOut",
      seller: { "@id": `${SITE_URL}/#organization` },
    },
  };
}

export function breadcrumbJsonLd(
  crumbs: { name: string; path: string }[],
) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: crumbs.map((crumb, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: crumb.name,
      item: absoluteUrl(crumb.path),
    })),
  };
}

/** FAQ markup — the format that wins expandable results and AI citations. */
export function faqJsonLd(faqs: { question: string; answer: string }[]) {
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faqs.map((faq) => ({
      "@type": "Question",
      name: faq.question,
      acceptedAnswer: { "@type": "Answer", text: faq.answer },
    })),
  };
}
