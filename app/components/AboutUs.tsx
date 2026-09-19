import React from "react";

const STATS = [
  { value: "3", label: "Residences" },
  { value: "24/7", label: "On-site security" },
  { value: "4.9", label: "Guest rating" },
];

const AboutUs: React.FC = () => {
  return (
    <section
      id="aboutus"
      className="section-y overflow-hidden bg-[var(--color-canvas)]"
    >
      <div className="shell grid items-center gap-14 lg:grid-cols-2 lg:gap-20">
        {/* ---------------- Copy ---------------- */}
        <div className="order-2 lg:order-1">
          <span className="eyebrow">About us</span>
          <h2 className="mt-2 text-3xl font-semibold tracking-tight text-[var(--color-ink)] sm:text-4xl">
            A calmer way to stay in Ghana
          </h2>

          <div className="mt-6 space-y-5 text-[15px] leading-relaxed text-[var(--color-muted)]">
            <p>
              At Cosy Crest Apartments we are committed to a refined,
              comfortable and memorable stay. Set in carefully selected serene
              environments, each home combines modern luxury with the warmth of
              home.
            </p>
            <p>
              Fully furnished interiors, premium amenities and attentive
              hospitality ensure every guest enjoys comfort, privacy and
              convenience — whether travelling for business, leisure or a short
              getaway.
            </p>
          </div>

          {/* Stat strip — concrete proof rather than adjectives */}
          <dl className="mt-9 grid grid-cols-3 gap-6 border-y border-[var(--color-line)] py-6">
            {STATS.map((stat) => (
              <div key={stat.label}>
                <dt className="sr-only">{stat.label}</dt>
                <dd>
                  <span className="block text-2xl font-semibold tracking-tight text-[var(--color-ink)]">
                    {stat.value}
                  </span>
                  <span className="mt-0.5 block text-xs text-[var(--color-muted)]">
                    {stat.label}
                  </span>
                </dd>
              </div>
            ))}
          </dl>

          <a
            href="#villas"
            className="mt-8 inline-flex items-center gap-2 text-sm font-semibold text-[var(--color-ink)] underline decoration-[var(--color-line)] decoration-2 underline-offset-4 transition-colors hover:decoration-[var(--color-ink)]"
          >
            Browse our apartments
          </a>
        </div>

        {/* ---------------- Collage ---------------- */}
        <div className="order-1 lg:order-2">
          <div className="relative mx-auto h-[420px] w-full max-w-lg sm:h-[520px]">
            <div className="absolute left-0 top-0 z-20 h-[58%] w-[58%] overflow-hidden rounded-xl border-4 border-[var(--color-canvas)] shadow-[var(--shadow-card)]">
              <img
                src="/Lake1.jpg"
                alt="Lakeside apartment interior"
                className="h-full w-full object-cover"
              />
            </div>

            <div className="absolute bottom-0 left-[8%] z-30 h-[42%] w-[62%] overflow-hidden rounded-xl border-4 border-[var(--color-canvas)] shadow-[var(--shadow-card)]">
              <img
                src="/Adenta1.jpg"
                alt="Adenta apartment living space"
                className="h-full w-full object-cover"
              />
            </div>

            <div className="absolute right-0 top-[18%] z-10 h-[62%] w-[48%] overflow-hidden rounded-xl shadow-[var(--shadow-raise)]">
              <img
                src="/Aburi1.jpeg"
                alt="Aburi mountain retreat"
                className="h-full w-full object-cover"
              />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default AboutUs;
