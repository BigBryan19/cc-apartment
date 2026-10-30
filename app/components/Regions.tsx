import React from "react";
import { ArrowUpRight } from "lucide-react";

/**
 * Destinations.
 *
 * The two cards used to show Unsplash photographs of landscapes that are not in
 * Ghana — the Greater Accra card was a coastal scene from elsewhere entirely.
 * They are now our own photographs: the Aburi apartment for the Eastern Region
 * and the Adenta exterior for Greater Accra.
 *
 * These are property photographs, not regional landscapes, so the section says
 * so rather than implying the image is the destination. A dedicated photograph
 * of the Aburi hills is still needed — see the handover notes — but a real
 * apartment beats a foreign landscape that misrepresents where a guest is going.
 */
const REGIONS = [
  {
    id: "eastern",
    title: "Eastern Region",
    subtitle: "Aburi, near Aburi Girls School",
    image: "/Aburi2.jpeg",
    alt: "Living room at our Aburi Mountain Retreat in the Eastern Region",
    caption: "Aburi Mountain Retreat",
  },
  {
    id: "accra",
    title: "Greater Accra",
    subtitle: "Lakeside Estate & Adenta",
    image: "/Adenta1.jpg",
    alt: "The exterior of Adenta Serenity in Greater Accra",
    caption: "Adenta Serenity",
  },
];

const Regions: React.FC = () => {
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
              className="group relative block h-[380px] overflow-hidden rounded-2xl md:h-[440px]"
            >
              <img
                src={region.image}
                alt={region.alt}
                loading="lazy"
                className="h-full w-full object-cover transition-transform duration-700 ease-out group-hover:scale-105"
              />
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
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white/15 text-white backdrop-blur-md transition-colors group-hover:bg-white group-hover:text-[var(--color-ink)]">
                  <ArrowUpRight size={18} />
                </span>
              </div>
            </a>
          ))}
        </div>

        <p className="mt-4 text-[11px] leading-relaxed text-[var(--color-faint)]">
          Both photographs show our own apartments in each region.
        </p>
      </div>
    </section>
  );
};

export default Regions;
