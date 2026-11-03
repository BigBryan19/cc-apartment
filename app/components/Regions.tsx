import React from "react";
import { ArrowUpRight } from "lucide-react";
import DestinationSlideshow from "./DestinationSlideshow";
import { EASTERN_REGION_PHOTOS, GREATER_ACCRA_PHOTOS } from "../lib/destinations";

/**
 * Destinations.
 *
 * The two cards used to show Unsplash photographs of landscapes that are not in
 * Ghana — the Greater Accra card was a coastal scene from elsewhere entirely.
 * They are now our own photographs: the Aburi apartment for the Eastern Region
 * and the Adenta exterior for Greater Accra.
 *
 * The Eastern Region card now rotates through photographs of the places guests
 * ask about — ATV trails, the waterfall, the gardens, the craft village — each
 * captioned with its name. The Greater Accra card is still an apartment
 * photograph until the owner supplies that region's places.
 */
const REGIONS = [
  {
    id: "eastern",
    title: "Eastern Region",
    subtitle: "Aburi, near Aburi Girls School",
    image: EASTERN_REGION_PHOTOS[0].src,
    alt: EASTERN_REGION_PHOTOS[0].alt,
    caption: "Aburi Mountain Retreat",
    /** Rotating places, Eastern Region only. */
    photos: EASTERN_REGION_PHOTOS,
  },
  {
    id: "accra",
    title: "Greater Accra",
    subtitle: "Lakeside Estate & Adenta",
    image: GREATER_ACCRA_PHOTOS[0].src,
    alt: GREATER_ACCRA_PHOTOS[0].alt,
    caption: "Lakeside Estate & Adenta Serenity",
    photos: GREATER_ACCRA_PHOTOS,
  },
];

const Regions: React.FC<{
  /** Narrows the apartment grid to this region. */
  onSelectRegion?: (region: string) => void;
  /** Region currently in force, so the chosen card can say so. */
  activeRegion?: string;
}> = ({ onSelectRegion, activeRegion }) => {
  return (
    <section className="section-y bg-white">
      <div className="shell">
        <div className="max-w-2xl">
          <span className="eyebrow">Destinations</span>
          <h2 className="mt-2 text-3xl font-semibold tracking-tight text-[var(--color-ink)] sm:text-4xl">
            Where you&apos;ll be staying
          </h2>
          <p className="mt-3 text-sm leading-relaxed text-[var(--color-muted)]">
            Two regions, each with its own pace — the cool hills of Aburi and the
            easy coastal energy of Greater Accra.
          </p>
        </div>

        <div className="mt-10 grid gap-6 md:grid-cols-2">
          {REGIONS.map((region) => (
            <a
              key={region.id}
              href="#villas"
              onClick={() => onSelectRegion?.(region.title)}
              aria-label={`Show apartments in ${region.title}`}
              className={`group relative block h-[380px] overflow-hidden rounded-2xl ring-2 transition-shadow md:h-[440px] ${
                activeRegion === region.title
                  ? "ring-[var(--color-ink)]"
                  : "ring-transparent"
              }`}
            >
              {region.photos ? (
                <DestinationSlideshow photos={region.photos} title={region.title} />
              ) : (
                <img
                  src={region.image}
                  alt={region.alt}
                  loading="lazy"
                  className="h-full w-full object-cover transition-transform duration-700 ease-out group-hover:scale-105"
                />
              )}
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />

              <div className="absolute inset-x-0 bottom-0 flex items-end justify-between gap-4 p-6 md:p-7">
                <div>
                  <h3 className="text-2xl font-semibold tracking-tight text-white md:text-3xl">
                    {region.title}
                  </h3>
                  <p className="mt-1 text-sm text-white/80">{region.subtitle}</p>
                  <p className="mt-2 text-[11px] uppercase tracking-[0.12em] text-white/55">
                    {region.caption}
                  </p>
                </div>
                <span className="flex shrink-0 items-center gap-2">
                  <span className="hidden rounded-full bg-white/15 px-3 py-2 text-[11px] font-semibold uppercase tracking-[0.1em] text-white backdrop-blur-md sm:block">
                    {activeRegion === region.title ? "Showing" : "See stays"}
                  </span>
                  <span className="flex h-10 w-10 items-center justify-center rounded-full bg-white/15 text-white backdrop-blur-md transition-colors group-hover:bg-white group-hover:text-[var(--color-ink)]">
                    <ArrowUpRight size={18} />
                  </span>
                </span>
              </div>
            </a>
          ))}
        </div>

        <p className="mt-4 text-[11px] leading-relaxed text-[var(--color-faint)]">
          Photographs show places in each region, not the apartments. Choosing a
          region filters the stays below to that region.
        </p>
      </div>
    </section>
  );
};

export default Regions;
