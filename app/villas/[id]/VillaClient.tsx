// app/villas/[id]/VillaClient.tsx
"use client";

import React, { useState, useEffect, use } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  ChevronLeft,
  ChevronRight,
  MapPin,
  Check,
  Plus,
  Share2,
  Star,
  Users,
  BedDouble,
  Bath,
  ArrowUpRight,
  Play,
  X,
  Images,
} from "lucide-react";
import { bundledVillas as villasData } from "../../lib/catalog";
import {
  isEnquiryOnly,
  priceBasisSuffix,
  unitCapacityLabel,
  unitFacilityLabels,
} from "../../lib/rates";
import { WEEKEND_RESTRICTION_MESSAGE, weekendAllowsUnit } from "../../lib/weekend";
import { EXTRAS } from "../../lib/extras";
import { whatsappLink } from "../../lib/contact";
import { useSiteTheme } from "../../components/ThemeProvider";
import { absoluteUrl } from "../../lib/seo";
import { priceUnit } from "../../lib/quote";
import Navbar from "../../components/Navbar";
import Footer from "../../components/Footer";
import { formatPrice, getAmenityIcon } from "../../components/villas/utils";
import type { VillaProps } from "../../components/villas/types";
import StayDateFields from "../../components/booking/StayDateFields";
import { useVillaAvailability } from "../../lib/availability";
import { validateStay } from "../../lib/dates";

/**
 * Guides worth reading for each property, linked from its detail page.
 *
 * These are internal links from the highest-intent pages on the site into the
 * guides, which is how a crawler reaches them and how authority transfers.
 * `default` covers an id that is not in the static catalogue.
 */
const LOCATION_GUIDES: Record<
  number | "default",
  { label: string; href: string }[]
> = {
  1: [
    { label: "Where to stay in Accra", href: "/guides/where-to-stay-in-accra" },
    {
      label: "Lakeside Estate: a local's guide",
      href: "/guides/lakeside-estate-accra",
    },
  ],
  2: [
    {
      label: "Staying in Aburi: the complete guide",
      href: "/guides/staying-in-aburi",
    },
    {
      label: "The best time to visit Ghana",
      href: "/guides/best-time-to-visit-ghana",
    },
  ],
  3: [
    {
      label: "Short let apartments in Adenta",
      href: "/guides/short-let-adenta",
    },
    {
      label: "What a short let includes",
      href: "/guides/what-a-short-let-includes",
    },
  ],
  default: [
    { label: "Where to stay in Accra", href: "/guides/where-to-stay-in-accra" },
    {
      label: "What a short let includes",
      href: "/guides/what-a-short-let-includes",
    },
  ],
};

/**
 * Add-ons offered on the property page.
 *
 * Previously three hard-coded chips with display labels ("Luxury Car Rental")
 * used as ids. The checkout looks extras up by catalogue id, so nothing matched,
 * every add-on fell through as unpriced, and a priced car rental still showed
 * "Quote pending". These are the catalogue entries themselves — same ids, same
 * prices — so a priced add-on is charged and only an unpriced one is quoted.
 */
const ADD_ONS = EXTRAS.filter((extra) => extra.active);

/** What one selected add-on costs for this stay, or null when unpriced. */
function addOnAmount(extra: (typeof ADD_ONS)[number], nights: number): number | null {
  if (extra.requiresQuote || extra.amount === null) return null;
  if (extra.priceBasis === "per_day") return nights > 0 ? extra.amount * nights : 0;
  return extra.amount;
}

export default function VillaClient({
  params,
  villa: loadedVilla,
}: {
  params: Promise<{ id: string }>;
  /**
   * Resolved on the server from the same row the checkout prices, so the figure
   * shown here is the figure that will be charged. `null` means the property does
   * not exist.
   */
  villa: VillaProps | null;
}) {
  const unwrappedParams = use(params);
  const router = useRouter();
  const villaId = parseInt(unwrappedParams.id);
  // Server-resolved property. The bundled copy is only a safety net for a
  // deployment where the server could not reach the database.
  const villa = loadedVilla ?? villasData.find((v) => v.id === villaId) ?? null;

  const availability = useVillaAvailability(
    Number.isNaN(villaId) ? null : villaId,
  );

  // Labels and the enquiry number come from Admin → Settings.
  const siteTheme = useSiteTheme();
  const [currency, setCurrency] = useState<"GHS" | "USD">("GHS");
  /*
   * How many people are coming. Held here rather than only on the checkout so a
   * room that cannot take the group is visibly refused on the property page —
   * the point at which the guest is choosing.
   */
  const [guests, setGuests] = useState<number>(2);
  const [selectedUnitId, setSelectedUnitId] = useState<string>("");
  const [checkInDate, setCheckInDate] = useState<string>("");
  const [checkOutDate, setCheckOutDate] = useState<string>("");
  const [selectedPackages, setSelectedPackages] = useState<string[]>([]);
  /**
   * Index into the media list shown in the lightbox. Photos and the walkthrough
   * video share one list, so the arrows move between both.
   */
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);

  /*
   * Preselects the cheapest sellable unit. Only the *identifier* is held in
   * state; the price is derived from the unit record below, so the figure on
   * screen can never drift from the unit actually selected.
   *
   * Units that cannot be sold online (monthly before its terms are configured,
   * or a quotation-only rate) are skipped rather than preselected, so the guest
   * does not land on something the checkout will refuse.
   */
  /* eslint-disable react-hooks/set-state-in-effect -- initial selection from a loaded prop; see comment above */
  useEffect(() => {
    if (!villa || !villa.units.length) return;
    const fits = (entry: (typeof villa.units)[number]) =>
      entry.maxGuests === null || entry.maxGuests >= guests;
    const sellable = villa.units.find((entry) => !isEnquiryOnly(entry) && fits(entry));
    setSelectedUnitId((sellable ?? villa.units[0]).id);
  }, [villa]);
  /* eslint-enable react-hooks/set-state-in-effect */

  if (!villa) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-white">
        <p className="text-[var(--color-muted)]">Villa not found</p>
        <button
          onClick={() => router.push("/")}
          className="btn-ink rounded-lg px-6 py-3 text-sm"
        >
          Back to home
        </button>
      </div>
    );
  }

  const totalNights = checkInDate && checkOutDate
    ? Math.max(
        0,
        Math.round(
          (new Date(checkOutDate).getTime() - new Date(checkInDate).getTime()) /
            86400000,
        ),
      )
    : 0;
  // The unit the guest actually chose, and what it costs for these dates.
  const selectedUnit =
    villa.units.find((entry) => entry.id === selectedUnitId) ?? villa.units[0] ?? null;

  // Priced with the same function the server uses, so the property page and the
  // charge agree. A refusal here means the unit is not sellable online.
  const unitPrice = selectedUnit
    ? priceUnit(selectedUnit, totalNights, guests)
    : ({ ok: false } as const);

  const selectedUnitAmount = unitPrice.ok ? unitPrice.amount : 0;

  // Add-ons actually selected, with what each costs. Pricing lives in the same
  // catalogue the checkout and the server use.
  const selectedAddOns = ADD_ONS.filter((extra) => selectedPackages.includes(extra.id)).map(
    (extra) => ({
      id: extra.id,
      name: extra.name,
      amount: addOnAmount(extra, totalNights),
    }),
  );
  const pricedAddOnTotal = selectedAddOns.reduce(
    (sum, entry) => sum + (entry.amount ?? 0),
    0,
  );
  const computedTotalPrice = selectedUnitAmount;

  /*
   * A rate that cannot be sold online (monthly, or quotation-only) has no
   * checkout to go to. Sending a guest there produced a dead end, so the button
   * becomes a WhatsApp enquiry carrying the property, the rate, the dates, the
   * party size and a link to the property's own photograph.
   *
   * WhatsApp cannot pre-attach an image through a link; the photo URL is in the
   * message so it arrives as a preview the guest can forward as-is.
   */
  const enquiryOnlySelection = selectedUnit ? isEnquiryOnly(selectedUnit) : false;
  const enquiryMessage = selectedUnit
    ? [
        `Hello Cosy Crest — I'd like to enquire about the ${selectedUnit.name} at ${villa.title}.`,
        checkInDate && checkOutDate
          ? `Dates: ${checkInDate} to ${checkOutDate} (${totalNights} night${totalNights === 1 ? "" : "s"}).`
          : "Dates: still deciding — please advise what is available.",
        `Guests: ${guests}.`,
        selectedUnit.priceBasis === "monthly"
          ? "Please send your monthly rates and the terms (minimum stay, notice, deposit)."
          : "Please send availability and pricing.",
        `Property photo: ${absoluteUrl(villa.images[0] ?? villa.image)}`,
      ].join(" ")
    : "";

  const stayError =
    checkInDate && checkOutDate
      ? validateStay(checkInDate, checkOutDate, availability.all)
      : null;

  const locationGuides =
    LOCATION_GUIDES[villa?.id ?? 0] ?? LOCATION_GUIDES.default;

  const togglePackage = (pkgId: string) =>
    setSelectedPackages((prev) =>
      prev.includes(pkgId) ? prev.filter((id) => id !== pkgId) : [...prev, pkgId],
    );

  const handleCheckoutBooking = () => {
    const query = new URLSearchParams({
      villaId: villa.id.toString(),
      unitId: selectedUnitId,
      // Sent as well as the id: the checkout prices the database row, whose
      // generated ids can differ from this page's. The name is the bridge.
      unitName: selectedUnit?.name ?? "",
      guests: String(guests),
      currency,
      checkIn: checkInDate,
      checkOut: checkOutDate,
      nights: totalNights.toString(),
      totalPrice: computedTotalPrice.toString(),
      packages: selectedPackages.join(","),
    });
    router.push(`/checkout?${query.toString()}`);
  };

  /**
   * Every asset that belongs to this property, video first.
   *
   * The gallery used to pad itself to four tiles by repeating `images[0]`, so a
   * villa with one photo showed the same room four times. It now lists the real
   * files only — each villa currently has four photographs and one walkthrough —
   * and the lightbox covers all of them.
   */
  /*
   * The chosen room's own clip, when it has one.
   *
   * The walkthrough covers the whole property; a studio clip covers the studio.
   * It sits after the walkthrough and before the photographs, and appears only
   * while that room is selected — so footage is never shown against a room it
   * was not filmed in.
   */
  const unitClip: { type: "video"; src: string; poster?: string; title: string }[] =
    selectedUnit?.video
      ? [
          {
            type: "video" as const,
            src: selectedUnit.video,
            poster: selectedUnit.videoPoster ?? villa.images[0],
            title: `${selectedUnit.name} at ${villa.title}`,
          },
        ]
      : [];

  const media: { type: "photo" | "video"; src: string; poster?: string; title: string }[] = [
    ...(villa.video
      ? [{ type: "video" as const, src: villa.video, poster: villa.images[0], title: `${villa.title} walkthrough` }]
      : []),
    ...unitClip,
    ...villa.images.map((src, index) => ({
      type: "photo" as const,
      src,
      title: `${villa.title} — photo ${index + 1}`,
    })),
  ];

  // `media` grows or shrinks when the selected room changes, so an index taken
  // before that change can point past the end. Clamp rather than render nothing.
  const safeLightboxIndex =
    lightboxIndex !== null && media.length > 0
      ? Math.min(lightboxIndex, media.length - 1)
      : null;
  const lightboxItem = safeLightboxIndex !== null ? media[safeLightboxIndex] : null;

  const stepLightbox = (delta: number) => {
    setLightboxIndex((current) => {
      if (current === null) return current;
      const next = current + delta;
      if (next < 0) return media.length - 1;
      if (next >= media.length) return 0;
      return next;
    });
  };

  const facts = [
    { Icon: Users, label: `${villa.guests} guests` },
    { Icon: BedDouble, label: `${villa.bedrooms} bedrooms` },
    { Icon: Bath, label: `${villa.bathrooms} baths` },
    ...(villa.hasPool ? [{ Icon: Star, label: "Private pool" }] : []),
  ];

  return (
    <div className="min-h-screen bg-white font-sans text-[var(--color-ink)]">
      <Navbar
        currency={currency}
        toggleCurrency={() => setCurrency(currency === "GHS" ? "USD" : "GHS")}
        variant="solid"
      />

      <div className="pt-16 md:pt-20">
        <div className="shell py-6 md:py-8">
          {/* Breadcrumb */}
          <button
            onClick={() => router.push("/")}
            className="mb-5 inline-flex items-center gap-1.5 text-sm font-medium text-[var(--color-muted)] transition-colors hover:text-[var(--color-ink)]"
          >
            <ChevronLeft size={16} /> All apartments
          </button>

          {/* Title row */}
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="min-w-0">
              <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">
                {villa.title}
              </h1>
              <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-[var(--color-muted)]">
                <span className="flex items-center gap-1.5">
                  <Star size={13} className="fill-[var(--color-ink)] text-[var(--color-ink)]" />
                  <span className="font-semibold text-[var(--color-ink)]">4.9</span>
                </span>
                <span className="flex items-center gap-1.5">
                  <MapPin size={13} /> {villa.location}
                </span>
              </div>
            </div>

            <button
              onClick={() =>
                navigator.share?.({ url: window.location.href }).catch(() => {})
              }
              className="flex items-center gap-2 rounded-lg border border-[var(--color-line)] px-4 py-2.5 text-sm font-medium transition-colors hover:bg-[var(--color-canvas)]"
            >
              <Share2 size={15} /> Share
            </button>
          </div>

          {/* Gallery.
              Every image that belongs to this apartment is shown — the mosaic
              used to hide the extra tiles on mobile behind `hidden md:block`,
              so a phone visitor saw one photo and never knew the rest existed. */}
          <div className="mt-6 overflow-hidden rounded-2xl">
            <button
              onClick={() => setLightboxIndex(0)}
              className="relative block aspect-[16/10] w-full overflow-hidden md:aspect-[21/9]"
              aria-label={`Open ${media[0]?.type === "video" ? "video" : "photo"} 1`}
            >
              <img
                src={media[0]?.poster ?? media[0]?.src ?? villa.image}
                alt={villa.title}
                className="h-full w-full object-cover transition-transform duration-700 hover:scale-[1.03]"
              />
              {media[0]?.type === "video" && (
                <span className="absolute inset-0 flex items-center justify-center bg-black/20">
                  <span className="flex h-14 w-14 items-center justify-center rounded-full bg-white/90 text-[var(--color-ink)] shadow-lg">
                    <Play size={20} fill="currentColor" aria-hidden="true" />
                  </span>
                </span>
              )}
            </button>
          </div>

          {/*
            Thumbnails live in a fixed-height window and scroll inside it.

            With twenty-one photographs on Adenta the grid pushed everything —
            rates, videos, the booking panel — far below the fold. A capped frame
            keeps the whole set available without the page growing with it. The
            grid still uses the full width, and the frame gets a visible edge so
            it reads as scrollable rather than cut off.
          */}
          {media.length > 1 && (
            <div className="mt-2 max-h-[228px] overflow-y-auto overscroll-contain rounded-xl border border-[var(--color-line-soft)] bg-[var(--color-canvas)]/40 p-2 [scrollbar-width:thin]">
              <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
              {media.slice(1).map((item, i) => (
                <button
                  key={item.src + i}
                  onClick={() => setLightboxIndex(i + 1)}
                  className="relative aspect-[4/3] overflow-hidden rounded-lg"
                  aria-label={`Open ${item.type === "video" ? "video" : "photo"} ${i + 2}`}
                >
                  <img
                    src={item.poster ?? item.src}
                    alt={`${villa.title} — view ${i + 2}`}
                    loading="lazy"
                    className="h-full w-full object-cover transition-transform duration-500 hover:scale-105"
                  />
                  {item.type === "video" && (
                    <span className="absolute inset-0 flex items-center justify-center bg-black/25">
                      <Play size={16} className="text-white" fill="currentColor" aria-hidden="true" />
                    </span>
                  )}
                </button>
              ))}
              </div>
            </div>
          )}

          {media.length > 0 && (
            <button
              onClick={() => setLightboxIndex(0)}
              className="mt-3 inline-flex items-center gap-2 text-xs font-semibold text-[var(--color-ink-soft)] transition-colors hover:text-[var(--color-ink)]"
            >
              <Images size={14} aria-hidden="true" />
              View all {media.length} photos and video
              {villa.video ? " & the walkthrough video" : ""}
            </button>
          )}

          {/* Body */}
          <div className="mt-10 grid grid-cols-1 gap-12 lg:grid-cols-12">
            {/* ---- Details ---- */}
            <div className="lg:col-span-7">
              <div className="flex flex-wrap gap-2">
                {facts.map(({ Icon, label }) => (
                  <span
                    key={label}
                    className="flex items-center gap-2 rounded-full bg-[var(--color-canvas)] px-3.5 py-2 text-[13px] font-medium text-[var(--color-ink-soft)]"
                  >
                    <Icon size={14} /> {label}
                  </span>
                ))}
              </div>

              <p className="mt-7 text-[15px] leading-relaxed text-[var(--color-muted)]">
                {villa.description}
              </p>

              {/* Internal links to the guides for this area. Useful to the
                  guest, and how authority flows from the property pages — the
                  strongest commercial pages — into the guides. */}
              {locationGuides.length > 0 && (
                <div className="mt-10 rounded-2xl border border-[var(--color-line)] bg-[var(--color-canvas)] p-6">
                  <h3 className="text-sm font-bold uppercase tracking-widest text-[var(--color-ink)]">
                    Planning your stay
                  </h3>
                  <p className="mt-2 text-xs leading-relaxed text-[var(--color-muted)]">
                    Get the most out of your visit with our local guides and practical tips.
                  </p>
                  <ul className="mt-5 space-y-3">
                    {locationGuides.map((guide) => (
                      <li key={guide.href}>
                        <Link
                          href={guide.href}
                          className="group flex items-center justify-between rounded-xl border border-white bg-white p-3.5 text-sm font-medium text-[var(--color-ink)] transition-all hover:border-[var(--color-line)] hover:shadow-sm"
                        >
                          {guide.label}
                          <ArrowUpRight
                            size={14}
                            className="text-[var(--color-faint)] transition-transform duration-200 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 group-hover:text-[var(--color-ink)]"
                          />
                        </Link>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              <div className="mt-10 border-t border-[var(--color-line-soft)] pt-8">
                <h2 className="text-xl font-semibold tracking-tight">
                  What this place offers
                </h2>
                <div className="mt-6 grid grid-cols-2 gap-x-4 gap-y-5 sm:grid-cols-3 lg:grid-cols-2">
                  {villa.amenities?.map((item) => (
                    <div key={item} className="flex items-center gap-3">
                      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[var(--color-canvas)] text-[var(--color-ink)]">
                        {getAmenityIcon(item)}
                      </span>
                      <span className="text-sm font-medium text-[var(--color-ink-soft)]">
                        {item}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Walkthrough. Two players at most: the property tour, and the
                  chosen room's own clip when it has one. A listing with neither
                  omits the section rather than showing an empty player — Adenta
                  currently has no walkthrough, and says so by omission instead
                  of borrowing another property's footage. */}
              {(villa.video || selectedUnit?.video) && (
                <div className="mt-10 border-t border-[var(--color-line-soft)] pt-8">
                  <h2 className="text-xl font-semibold tracking-tight">
                    Walkthrough
                  </h2>
                  <p className="mt-1 text-sm text-[var(--color-muted)]">
                    A short tour of the apartment before you book.
                  </p>
                  {villa.video && (
                    <video
                      src={villa.video}
                      poster={villa.images[0]}
                      controls
                      playsInline
                      preload="metadata"
                      className="mt-4 w-full rounded-2xl bg-black"
                    >
                      Your browser does not support embedded video.
                    </video>
                  )}
                  {selectedUnit?.video && (
                    <figure className="mt-6">
                      <video
                        key={selectedUnit.video}
                        src={selectedUnit.video}
                        poster={selectedUnit.videoPoster ?? villa.images[0]}
                        controls
                        playsInline
                        preload="metadata"
                        className="w-full rounded-2xl bg-black"
                      >
                        Your browser does not support embedded video.
                      </video>
                      <figcaption className="mt-2 text-xs text-[var(--color-muted)]">
                        {selectedUnit.name} at {villa.title} — filmed in this room.
                      </figcaption>
                    </figure>
                  )}
                </div>
              )}

              {/*
                Explore Aburi — nearby places, deliberately separate from the
                amenities list above. Nothing here states a distance, a drive
                time, an entry fee or an inclusion, because none has been
                verified. Photographs of the gardens and craft village are not
                published yet; the section says so rather than borrowing an
                unrelated image.
              */}
              {villa.id === 2 && (
                <section className="mt-10 border-t border-[var(--color-line-soft)] pt-8">
                  <h2 className="text-xl font-semibold tracking-tight">Explore Aburi</h2>
                  <p className="mt-1 text-sm text-[var(--color-muted)]">
                    Places near the retreat that guests ask about. These are not
                    part of the apartment and are not included in your stay.
                  </p>
                  <ul className="mt-5 space-y-3">
                    {[
                      {
                        name: "Aburi Botanical Gardens",
                        text: "One of Ghana's oldest botanical gardens, on the ridge above Accra, with mature trees and walking paths.",
                        photo: "/media/destinations/eastern/aburi-botanical-gardens-1.jpg",
                      },
                      {
                        name: "Aburi Craft Village",
                        text: "Woodcarvers and textile makers selling stools, carvings and cloth along the Accra–Aburi road.",
                        photo: "/media/destinations/eastern/aburi-craft-village-1.jpg",
                      },
                      {
                        name: "The Akuapem ridge",
                        text: "The hill country around Aburi, cooler and greener than the coast, with views back towards Accra on a clear day.",
                      },
                    ].map((place) => (
                      <li
                        key={place.name}
                        className="overflow-hidden rounded-xl border border-[var(--color-line-soft)]"
                      >
                        {"photo" in place && place.photo ? (
                          <img
                            src={place.photo}
                            alt={place.name}
                            loading="lazy"
                            className="h-40 w-full object-cover"
                          />
                        ) : null}
                        <div className="p-4">
                          <span className="block text-sm font-semibold text-[var(--color-ink)]">
                            {place.name}
                          </span>
                          <span className="mt-1 block text-sm leading-relaxed text-[var(--color-muted)]">
                            {place.text}
                          </span>
                        </div>
                      </li>
                    ))}
                  </ul>
                  <p className="mt-3 text-xs text-[var(--color-faint)]">
                    Photographs of the gardens and the craft village are ours;
                    the ridge itself is shown in the property photography above.
                  </p>
                  <a
                    href="/guides/staying-in-aburi"
                    className="mt-4 inline-block text-sm font-medium underline underline-offset-4"
                  >
                    Read our guide to staying in Aburi
                  </a>
                </section>
              )}

              {/* Rate card */}
              <div className="mt-10 border-t border-[var(--color-line-soft)] pt-8">
                <h2 className="text-xl font-semibold tracking-tight">
                  Room options
                </h2>
                <div className="mt-5 space-y-3">
                  {villa.units.map((unit) => {
                    const isSelected = selectedUnitId === unit.id;
                    const enquiryOnly = isEnquiryOnly(unit);
                    const capacity = unitCapacityLabel(unit);
                    const facilities = unitFacilityLabels(unit);
                    // Too small for this group.
                    const tooSmall =
                      unit.maxGuests !== null && guests > unit.maxGuests;
                    // Not bookable for these dates (weekend rule at Adenta).
                    const weekendBlocked = !weekendAllowsUnit(
                      villa.id,
                      unit,
                      checkInDate,
                      checkOutDate,
                    );
                    const unavailable = tooSmall || weekendBlocked;

                    return (
                      <div key={unit.id}>
                        <button
                          type="button"
                          onClick={() => !unavailable && setSelectedUnitId(unit.id)}
                          disabled={unavailable}
                          aria-describedby={unavailable ? `why-${unit.id}` : undefined}
                          className={`group relative flex w-full items-center gap-4 overflow-hidden rounded-2xl border p-3 text-left transition-all ${
                            unavailable
                              ? "cursor-not-allowed border-[var(--color-line-soft)] bg-[var(--color-canvas)] opacity-60"
                              : isSelected
                                ? "border-[var(--color-ink)] bg-white shadow-[var(--shadow-card)]"
                                : "border-[var(--color-line-soft)] bg-white hover:border-[var(--color-line)]"
                          }`}
                        >
                          <div className="relative h-20 w-24 shrink-0 overflow-hidden rounded-xl bg-[var(--color-canvas)]">
                            <img
                              src={villa.images[0]}
                              alt={unit.name}
                              className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                            />
                          </div>
                          <div className="flex flex-1 items-center justify-between gap-4">
                            <div className="min-w-0">
                              <span className="block text-sm font-semibold text-[var(--color-ink)]">
                                {unit.name}
                              </span>
                              {capacity && (
                                <span className="mt-0.5 block text-xs text-[var(--color-muted)]">
                                  {capacity}
                                </span>
                              )}
                              {tooSmall && (
                                <span
                                  id={`why-${unit.id}`}
                                  className="mt-1 block text-xs font-medium text-amber-700"
                                >
                                  Too small for {guests} guests
                                </span>
                              )}
                              {!tooSmall && weekendBlocked && (
                                <span
                                  id={`why-${unit.id}`}
                                  className="mt-1 block text-xs font-medium text-amber-700"
                                >
                                  {WEEKEND_RESTRICTION_MESSAGE}
                                </span>
                              )}
                              {facilities.length > 0 && (
                                <span className="mt-1 block text-xs text-[var(--color-faint)]">
                                  {facilities.join(" · ")}
                                </span>
                              )}
                            </div>
                            <div className="shrink-0 text-right">
                              {enquiryOnly ? (
                                <span className="text-xs font-medium text-[var(--color-muted)]">
                                  {unit.priceBasis === "monthly"
                                    ? "Enquire for monthly rates"
                                    : "Enquire"}
                                </span>
                              ) : (
                                <div className="flex flex-col items-end">
                                  <span className="text-sm font-bold text-[var(--color-ink)]">
                                    {formatPrice(unit.amount, currency)}
                                  </span>
                                  <span className="text-[10px] text-[var(--color-faint)]">
                                    {priceBasisSuffix(unit.priceBasis)}
                                  </span>
                                </div>
                              )}
                            </div>
                          </div>
                          {isSelected && (
                            <div className="absolute right-2 top-2 h-2 w-2 rounded-full bg-[var(--color-ink)]" />
                          )}
                        </button>

                        {/*
                          Says why a unit cannot be booked online, instead of
                          showing a price that the checkout would then refuse.
                        */}
                        {enquiryOnly && (
                          <p className="mt-2 pl-3 text-[10px] leading-relaxed text-[var(--color-faint)]">
                            {unit.reviewNote ??
                              "This option is arranged by enquiry. Ask us and we will confirm availability and price."}
                          </p>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* ---- Sticky booking card ---- */}
            <div className="lg:col-span-5">
              <div className="sticky top-24 rounded-2xl border border-[var(--color-line)] bg-white p-6 shadow-[var(--shadow-card)]">
                <div className="flex items-baseline justify-between gap-3">
                  <p className="text-xl">
                    <span className="font-semibold">
                      {selectedUnitAmount > 0 ? formatPrice(selectedUnitAmount, currency) : "Enquire"}
                    </span>
                    <span className="text-sm text-[var(--color-muted)]">
                      {" "}
                      {/* The basis decides the suffix; a per-stay unit is not
                          "per night" just because it is accommodation. */}
                      {selectedUnit ? priceBasisSuffix(selectedUnit.priceBasis) : ""}
                    </span>
                  </p>
                  <span className="flex items-center gap-1 text-[13px] text-[var(--color-muted)]">
                    <Star size={12} className="fill-[var(--color-ink)] text-[var(--color-ink)]" />
                    4.9
                  </span>
                </div>

                {/* Dates */}
                <div className="mt-5 rounded-xl border border-[var(--color-line)] p-4">
                  {availability.isLoading && (
                    <span className="text-[10px] uppercase tracking-wider text-[var(--color-faint)]">
                      Checking availability…
                    </span>
                  )}

                  <StayDateFields
                    className="mt-3"
                    checkIn={checkInDate}
                    checkOut={checkOutDate}
                    unavailableRanges={availability.all}
                    onChange={(nextIn, nextOut) => {
                      setCheckInDate(nextIn);
                      setCheckOutDate(nextOut);
                    }}
                    message={
                      availability.error
                        ? "Live availability is unavailable — showing the default booking window only."
                        : undefined
                    }
                  />
                </div>

                {/* Guests. Drives which rooms are offered and what they cost. */}
                <div className="mt-4 rounded-xl border border-[var(--color-line)] p-4">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <label
                        htmlFor="villa-guests"
                        className="block text-sm font-medium text-[var(--color-ink)]"
                      >
                        Guests
                      </label>
                      <span className="mt-0.5 block text-xs text-[var(--color-muted)]">
                        This home sleeps up to {villa.guests}. Rooms that cannot
                        take your group are greyed out.
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        aria-label="Fewer guests"
                        onClick={() => setGuests((value) => Math.max(1, value - 1))}
                        className="h-8 w-8 rounded-full border border-[var(--color-line)] text-sm font-semibold"
                      >
                        −
                      </button>
                      <input
                        id="villa-guests"
                        type="number"
                        min={1}
                        max={Math.max(villa.guests, 1)}
                        value={guests}
                        onChange={(event) =>
                          setGuests(
                            Math.min(
                              Math.max(villa.guests, 1),
                              Math.max(1, Number(event.target.value) || 1),
                            ),
                          )
                        }
                        className="w-14 rounded-lg border border-[var(--color-line)] px-2 py-1 text-center text-sm"
                      />
                      <button
                        type="button"
                        aria-label="More guests"
                        onClick={() =>
                          setGuests((value) => Math.min(Math.max(villa.guests, 1), value + 1))
                        }
                        className="h-8 w-8 rounded-full border border-[var(--color-line)] text-sm font-semibold"
                      >
                        +
                      </button>
                    </div>
                  </div>
                </div>

                {/* Packages */}
                <div className="mt-5">
                  <span className="eyebrow">Add to your stay</span>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {ADD_ONS.map((extra) => {
                      const isSelected = selectedPackages.includes(extra.id);
                      return (
                        <button
                          key={extra.id}
                          onClick={() => togglePackage(extra.id)}
                          title={extra.summary}
                          className={`flex items-center gap-1.5 rounded-full border px-3.5 py-2 text-[13px] font-medium transition-colors ${
                            isSelected
                              ? "border-[var(--color-ink)] bg-[var(--color-ink)] text-white"
                              : "border-[var(--color-line)] text-[var(--color-ink-soft)] hover:border-[var(--color-ink)]"
                          }`}
                        >
                          {isSelected ? <Check size={13} /> : <Plus size={13} />}
                          {/*
                            Name only. The price belongs in the summary below,
                            where it is itemised against the actual stay length;
                            a figure in the pill competed with the room rate for
                            attention and read as part of it.
                          */}
                          {extra.name.replace(" — Hyundai Tucson", "")}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Price breakdown */}
                {totalNights > 0 && (
                  <dl className="mt-6 space-y-2.5 border-t border-[var(--color-line-soft)] pt-5 text-sm">
                    <div className="flex justify-between text-[var(--color-muted)]">
                      <dt>
                        {/* The engine's own wording: a per-stay rate is not
                            "x nights", and printing it that way is how the
                            monthly/nightly confusion started. */}
                        {unitPrice.ok ? unitPrice.detail : selectedUnit.name}
                      </dt>
                      <dd className="text-[var(--color-ink)]">
                        {formatPrice(computedTotalPrice, currency)}
                      </dd>
                    </div>
                    {selectedAddOns.map((entry) => (
                      <div key={entry.id} className="flex justify-between text-[var(--color-muted)]">
                        <dt>{entry.name}</dt>
                        <dd>{entry.amount === null ? "Quoted separately" : formatPrice(entry.amount, currency)}</dd>
                      </div>
                    ))}
                    <div className="flex justify-between border-t border-[var(--color-line-soft)] pt-3 text-base font-semibold">
                      <dt>Total</dt>
                      <dd>{formatPrice(computedTotalPrice + pricedAddOnTotal, currency)}</dd>
                    </div>
                    {selectedAddOns.some((entry) => entry.amount === null) && (
                      <p className="pt-1 text-[11px] leading-relaxed text-[var(--color-faint)]">
                        Anything marked &quot;quoted separately&quot; is not in the total yet.
                      </p>
                    )}
                  </dl>
                )}

                {stayError && (
                  <p className="mt-4 rounded-lg border border-amber-200 bg-amber-50 p-3 text-[12px] leading-relaxed text-amber-800">
                    {stayError}
                  </p>
                )}

                {enquiryOnlySelection ? (
                  <a
                    href={whatsappLink(enquiryMessage, siteTheme.whatsappNumber)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="btn-accent mt-5 flex w-full items-center justify-center gap-2 rounded-xl py-4 text-sm"
                  >
                    {selectedUnit?.priceBasis === "monthly"
                      ? "Enquire about monthly rates on WhatsApp"
                      : siteTheme.enquiryCtaLabel}
                  </a>
                ) : (
                  <button
                    onClick={handleCheckoutBooking}
                    disabled={
                      !checkInDate ||
                      !checkOutDate ||
                      totalNights === 0 ||
                      Boolean(stayError) ||
                      (selectedUnit?.maxGuests !== null &&
                        selectedUnit !== null &&
                        guests > (selectedUnit.maxGuests as number)) ||
                      !weekendAllowsUnit(villa.id, selectedUnit ?? { kind: "room" }, checkInDate, checkOutDate)
                    }
                    className="btn-accent mt-5 w-full rounded-xl py-4 text-sm"
                  >
                    {!checkInDate || !checkOutDate
                      ? "Select dates to book"
                      : siteTheme.primaryCtaLabel}
                  </button>
                )}

                <p className="mt-3 text-center text-xs text-[var(--color-muted)]">
                  {enquiryOnlySelection
                    ? "Opens WhatsApp with your details filled in — nothing is booked or charged until we reply."
                    : "You won't be charged until the next step."}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Lightbox — photographs and the walkthrough share one sequence. */}
      {lightboxItem && (
        <div
          className="fixed inset-0 z-[200] flex items-center justify-center bg-black/92 p-4"
          onClick={() => setLightboxIndex(null)}
          role="dialog"
          aria-modal="true"
          aria-label={lightboxItem.title}
        >
          <button
            type="button"
            onClick={() => setLightboxIndex(null)}
            aria-label="Close"
            className="absolute right-4 top-4 z-10 rounded-full bg-white/10 p-2.5 text-white transition-colors hover:bg-white/20"
          >
            <X size={20} />
          </button>

          {media.length > 1 && (
            <>
              <button
                type="button"
                onClick={(event) => {
                  event.stopPropagation();
                  stepLightbox(-1);
                }}
                aria-label="Previous"
                className="absolute left-3 z-10 rounded-full bg-white/10 p-3 text-white transition-colors hover:bg-white/20 md:left-6"
              >
                <ChevronLeft size={22} />
              </button>
              <button
                type="button"
                onClick={(event) => {
                  event.stopPropagation();
                  stepLightbox(1);
                }}
                aria-label="Next"
                className="absolute right-3 z-10 rounded-full bg-white/10 p-3 text-white transition-colors hover:bg-white/20 md:right-6"
              >
                <ChevronRight size={22} />
              </button>
            </>
          )}

          <div
            className="w-full max-w-5xl"
            onClick={(event) => event.stopPropagation()}
          >
            {lightboxItem.type === "video" ? (
              <video
                key={lightboxItem.src}
                src={lightboxItem.src}
                poster={lightboxItem.poster}
                controls
                autoPlay
                playsInline
                preload="metadata"
                className="mx-auto max-h-[80vh] w-full rounded-lg bg-black"
              >
                Your browser does not support embedded video.
              </video>
            ) : (
              <img
                src={lightboxItem.src}
                alt={villa.title}
                className="mx-auto max-h-[80vh] w-auto max-w-full rounded-lg object-contain"
              />
            )}
            <p className="mt-3 text-center text-[10px] uppercase tracking-[0.14em] text-white/50">
              {(safeLightboxIndex ?? 0) + 1} / {media.length}
            </p>
          </div>
        </div>
      )}

      {/* No contact card on the property page, by request. `showContact={false}`
          keeps the footer from rendering its copy either, so the whole page is
          free of it — the booking flow is the only call to action here. */}
      <Footer showContact={false} />
    </div>
  );
}
