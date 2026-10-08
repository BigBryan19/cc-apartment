// app/villas/[id]/VillaClient.tsx
"use client";

import React, { useState, useEffect, use } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  ChevronLeft,
  MapPin,
  Check,
  Calendar,
  Heart,
  Gift,
  CarFront,
  Plus,
  Share2,
  Star,
  Users,
  BedDouble,
  Bath,
  ArrowUpRight,
} from "lucide-react";
import { bundledVillas as villasData } from "../../lib/catalog";
import {
  isEnquiryOnly,
  priceBasisSuffix,
  unitCapacityLabel,
  unitFacilityLabels,
} from "../../lib/rates";
import { priceUnit } from "../../lib/quote";
import Navbar from "../../components/Navbar";
import Footer from "../../components/Footer";
import { formatPrice, getAmenityIcon } from "../../components/villas/utils";
import DateRangePicker from "../../components/booking/DateRangePicker";
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

const AVAILABLE_PACKAGES = [
  { id: "Honeymoon Setup", icon: Heart, label: "Honeymoon" },
  { id: "Birthday Decoration", icon: Gift, label: "Birthday" },
  { id: "Luxury Car Rental", icon: CarFront, label: "Car rental" },
];

export default function VillaClient({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const unwrappedParams = use(params);
  const router = useRouter();
  const villaId = parseInt(unwrappedParams.id);
  const villa = villasData.find((v) => v.id === villaId);

  const availability = useVillaAvailability(
    Number.isNaN(villaId) ? null : villaId,
  );

  const [currency, setCurrency] = useState<"GHS" | "USD">("GHS");
  const [selectedUnitId, setSelectedUnitId] = useState<string>("");
  const [checkInDate, setCheckInDate] = useState<string>("");
  const [checkOutDate, setCheckOutDate] = useState<string>("");
  const [selectedPackages, setSelectedPackages] = useState<string[]>([]);
  const [lightbox, setLightbox] = useState<string | null>(null);

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
    const sellable = villa.units.find((entry) => !isEnquiryOnly(entry));
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
    ? priceUnit(selectedUnit, totalNights, villa.guests)
    : ({ ok: false } as const);

  const selectedUnitAmount = unitPrice.ok ? unitPrice.amount : 0;
  const computedTotalPrice = selectedUnitAmount;

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
      currency,
      checkIn: checkInDate,
      checkOut: checkOutDate,
      nights: totalNights.toString(),
      totalPrice: computedTotalPrice.toString(),
      packages: selectedPackages.join(","),
    });
    router.push(`/checkout?${query.toString()}`);
  };

  const gallery = [
    villa.images[0],
    villa.images[1] ?? villa.images[0],
    villa.images[2] ?? villa.images[0],
    villa.images[3] ?? villa.images[0],
  ];

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

          {/* Gallery */}
          <div className="mt-6 grid grid-cols-4 grid-rows-2 gap-2 overflow-hidden rounded-2xl md:h-[440px]">
            <button
              onClick={() => setLightbox(gallery[0])}
              className="col-span-4 row-span-2 h-64 overflow-hidden md:col-span-2 md:h-auto"
            >
              <img
                src={gallery[0]}
                alt={villa.title}
                className="h-full w-full object-cover transition-transform duration-500 hover:scale-105"
              />
            </button>
            {gallery.slice(1, 5).map((src, i) => (
              <button
                key={i}
                onClick={() => setLightbox(src)}
                className="hidden overflow-hidden md:block"
              >
                <img
                  src={src}
                  alt={`${villa.title} photo ${i + 2}`}
                  className="h-full w-full object-cover transition-transform duration-500 hover:scale-105"
                />
              </button>
            ))}
          </div>

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
                <div className="mt-8 rounded-2xl border border-[var(--color-line)] bg-[var(--color-canvas)] p-5">
                  <p className="eyebrow mb-3">Planning your stay</p>
                  <ul className="space-y-2.5">
                    {locationGuides.map((guide) => (
                      <li key={guide.href}>
                        <Link
                          href={guide.href}
                          className="group inline-flex items-center gap-1.5 text-sm font-medium text-[var(--color-ink)] transition-opacity hover:opacity-70"
                        >
                          {guide.label}
                          <ArrowUpRight
                            size={13}
                            className="transition-transform duration-200 group-hover:translate-x-0.5 group-hover:-translate-y-0.5"
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
                <div className="mt-5 grid grid-cols-1 gap-x-8 gap-y-4 sm:grid-cols-2">
                  {villa.amenities?.map((item) => (
                    <div key={item} className="flex items-center gap-3.5">
                      {getAmenityIcon(item)}
                      <span className="text-sm text-[var(--color-ink-soft)]">
                        {item}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Rate card */}
              <div className="mt-10 border-t border-[var(--color-line-soft)] pt-8">
                <h2 className="text-xl font-semibold tracking-tight">
                  Room options
                </h2>
                <div className="mt-5 divide-y divide-[var(--color-line-soft)] border-y border-[var(--color-line-soft)]">
                  {villa.units.map((unit) => {
                    const isSelected = selectedUnitId === unit.id;
                    const enquiryOnly = isEnquiryOnly(unit);
                    const capacity = unitCapacityLabel(unit);
                    const facilities = unitFacilityLabels(unit);

                    return (
                      <div key={unit.id} className="py-4">
                        <button
                          type="button"
                          onClick={() => setSelectedUnitId(unit.id)}
                          aria-pressed={isSelected}
                          className="flex w-full items-start justify-between gap-4 text-left"
                        >
                          <span className="flex items-start gap-3">
                            <span
                              aria-hidden="true"
                              className={`mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full border transition-colors ${
                                isSelected
                                  ? "border-[var(--color-ink)] bg-[var(--color-ink)]"
                                  : "border-[var(--color-line)]"
                              }`}
                            >
                              {isSelected && <Check size={10} className="text-white" />}
                            </span>
                            <span className="min-w-0">
                              <span className="block text-sm font-medium">{unit.name}</span>
                              {/*
                                The unit's OWN capacity, never the property total.
                                Showing "4 Beds - 4 Guests" against a single room was
                                the reported checkout defect.
                              */}
                              {capacity && (
                                <span className="mt-1 block text-xs text-[var(--color-muted)]">
                                  {capacity}
                                </span>
                              )}
                              {facilities.length > 0 && (
                                <span className="mt-1 block text-xs text-[var(--color-faint)]">
                                  {facilities.join(" · ")}
                                </span>
                              )}
                            </span>
                          </span>
                          <span className="shrink-0 text-right text-sm">
                            {enquiryOnly ? (
                              <span className="text-[var(--color-muted)]">Enquire</span>
                            ) : (
                              <>
                                <span className="font-semibold">
                                  {formatPrice(unit.amount, currency)}
                                </span>
                                <span className="text-[var(--color-muted)]">
                                  {" "}
                                  {priceBasisSuffix(unit.priceBasis)}
                                </span>
                              </>
                            )}
                          </span>
                        </button>

                        {/*
                          Says why a unit cannot be booked online, instead of
                          showing a price that the checkout would then refuse.
                        */}
                        {enquiryOnly && (
                          <p className="mt-2 pl-7 text-xs leading-relaxed text-[var(--color-faint)]">
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
                      / night
                    </span>
                  </p>
                  <span className="flex items-center gap-1 text-[13px] text-[var(--color-muted)]">
                    <Star size={12} className="fill-[var(--color-ink)] text-[var(--color-ink)]" />
                    4.9
                  </span>
                </div>

                {/* Dates */}
                <div className="mt-5 rounded-xl border border-[var(--color-line)] p-4">
                  <span className="flex items-center justify-between">
                    <span className="eyebrow flex items-center gap-1.5">
                      <Calendar size={13} /> Stay dates
                    </span>
                    {availability.isLoading && (
                      <span className="text-[10px] uppercase tracking-wider text-[var(--color-faint)]">
                        Checking…
                      </span>
                    )}
                  </span>

                  <DateRangePicker
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

                {/* Packages */}
                <div className="mt-5">
                  <span className="eyebrow">Add to your stay</span>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {AVAILABLE_PACKAGES.map((pkg) => {
                      const isSelected = selectedPackages.includes(pkg.id);
                      return (
                        <button
                          key={pkg.id}
                          onClick={() => togglePackage(pkg.id)}
                          className={`flex items-center gap-1.5 rounded-full border px-3.5 py-2 text-[13px] font-medium transition-colors ${
                            isSelected
                              ? "border-[var(--color-ink)] bg-[var(--color-ink)] text-white"
                              : "border-[var(--color-line)] text-[var(--color-ink-soft)] hover:border-[var(--color-ink)]"
                          }`}
                        >
                          {isSelected ? <Check size={13} /> : <Plus size={13} />}
                          {pkg.label}
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
                        {formatPrice(selectedUnit.amount, currency)} × {totalNights}{" "}
                        night{totalNights === 1 ? "" : "s"}
                      </dt>
                      <dd className="text-[var(--color-ink)]">
                        {formatPrice(computedTotalPrice, currency)}
                      </dd>
                    </div>
                    {selectedPackages.length > 0 && (
                      <div className="flex justify-between text-[var(--color-muted)]">
                        <dt>{selectedPackages.length} add-on(s)</dt>
                        <dd>Quote pending</dd>
                      </div>
                    )}
                    <div className="flex justify-between border-t border-[var(--color-line-soft)] pt-3 text-base font-semibold">
                      <dt>Total</dt>
                      <dd>{formatPrice(computedTotalPrice, currency)}</dd>
                    </div>
                  </dl>
                )}

                {stayError && (
                  <p className="mt-4 rounded-lg border border-amber-200 bg-amber-50 p-3 text-[12px] leading-relaxed text-amber-800">
                    {stayError}
                  </p>
                )}

                <button
                  onClick={handleCheckoutBooking}
                  disabled={
                    !checkInDate ||
                    !checkOutDate ||
                    totalNights === 0 ||
                    Boolean(stayError)
                  }
                  className="btn-accent mt-5 w-full rounded-xl py-4 text-sm"
                >
                  {!checkInDate || !checkOutDate
                    ? "Select dates to book"
                    : "Reserve now"}
                </button>

                <p className="mt-3 text-center text-xs text-[var(--color-muted)]">
                  You won&apos;t be charged until the next step.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Lightbox */}
      {lightbox && (
        <div
          className="fixed inset-0 z-[200] flex items-center justify-center bg-black/90 p-4"
          onClick={() => setLightbox(null)}
          role="dialog"
          aria-modal="true"
        >
          <img
            src={lightbox}
            alt={villa.title}
            className="max-h-full max-w-full rounded-lg object-contain"
          />
        </div>
      )}

      {/* No contact card on the property page, by request. `showContact={false}`
          keeps the footer from rendering its copy either, so the whole page is
          free of it — the booking flow is the only call to action here. */}
      <Footer showContact={false} />
    </div>
  );
}
