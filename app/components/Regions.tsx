import React from "react";
import { ArrowUpRight } from "lucide-react";

const REGIONS = [
  {
    id: "eastern",
    title: "Eastern Region",
    subtitle: "Aburi, near Aburi Girls School",
    image:
      "https://images.unsplash.com/photo-1596394516093-501ba68a0ba6?q=80&w=2070&auto=format&fit=crop",
    alt: "Lush hills of the Eastern Region",
  },
  {
    id: "accra",
    title: "Greater Accra",
    subtitle: "Lakeside Estate & Adenta",
    image:
      "https://images.unsplash.com/photo-1534008897995-27a23e859048?q=80&w=2070&auto=format&fit=crop",
    alt: "Greater Accra coastline",
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
              <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/15 to-transparent" />

              <div className="absolute inset-x-0 bottom-0 flex items-end justify-between gap-4 p-6 md:p-7">
                <div>
                  <h3 className="text-2xl font-semibold tracking-tight text-white md:text-3xl">
                    {region.title}
                  </h3>
                  <p className="mt-1 text-sm text-white/80">{region.subtitle}</p>
                </div>
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white/15 text-white backdrop-blur-md transition-colors group-hover:bg-white group-hover:text-[var(--color-ink)]">
                  <ArrowUpRight size={18} />
                </span>
              </div>
            </a>
          ))}
        </div>
      </div>
    </section>
  );
};

export default Regions;
