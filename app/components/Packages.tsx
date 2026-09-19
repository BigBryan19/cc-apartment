"use client";
import React from "react";
import { Heart, Gift, CarFront, ArrowRight } from "lucide-react";

const STATS = [
  { value: "50+", label: "Birthdays hosted" },
  { value: "30+", label: "Honeymoons" },
  { value: "24/7", label: "Concierge" },
  { value: "100%", label: "Satisfaction" },
];

const SPECIAL_PACKAGES = [
  {
    id: "honeymoon",
    title: "Honeymoon & Couples",
    price: "From GHS 500",
    shortDesc: "Romantic setups and complete privacy.",
    icon: Heart,
    // Local asset: the previous Unsplash photo ID returns 404 and left the
    // card with a broken image.
    image: "/Lake2.jpg",
    popular: true,
  },
  {
    id: "birthday",
    title: "Birthday Celebrations",
    price: "From GHS 5,000",
    shortDesc: "Make the day unforgettable.",
    icon: Gift,
    // Local asset: the previous Unsplash photo ID returns 404.
    image: "/Adenta3.jpg",
    popular: false,
  },
  {
    id: "car-rental",
    title: "Luxury Car Rental",
    price: "From GHS 350",
    shortDesc: "Travel in style and comfort.",
    icon: CarFront,
    image:
      "https://images.unsplash.com/photo-1494976388531-d1058494cdd8?q=80&w=2070&auto=format&fit=crop",
    popular: false,
  },
];

const Packages: React.FC = () => {
  const handlePackageInquiry = (title: string) => {
    const message = `Hello! I was looking at the Cosy Crest website and I am very interested in the *${title}* package. Can you provide more details?`;
    window.open(
      `https://wa.me/2330540534870?text=${encodeURIComponent(message)}`,
      "_blank",
    );
  };

  return (
    <section id="packages" className="section-y bg-[var(--color-canvas)]">
      <div className="shell">
        {/* ---- Header ---- */}
        <div className="max-w-2xl">
          <span className="eyebrow">Add-ons</span>
          <h2 className="mt-2 text-3xl font-semibold tracking-tight text-[var(--color-ink)] sm:text-4xl">
            Make the stay an occasion
          </h2>
          <p className="mt-3 text-sm leading-relaxed text-[var(--color-muted)]">
            Honeymoon setups, birthday staycations and chauffeur-driven cars —
            arranged before you arrive and billed as an add-on.
          </p>
        </div>

        {/* ---- Stats ---- */}
        <dl className="mt-10 grid grid-cols-2 gap-6 border-y border-[var(--color-line)] py-7 sm:grid-cols-4">
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

        {/* ---- Package cards ---- */}
        <div className="mt-10 grid grid-cols-1 gap-6 md:grid-cols-3">
          {SPECIAL_PACKAGES.map((pkg) => (
            <article
              key={pkg.id}
              className="group flex flex-col overflow-hidden rounded-2xl bg-white shadow-[var(--shadow-raise)] transition-shadow duration-300 hover:shadow-[var(--shadow-card)]"
            >
              <div className="relative aspect-[16/10] overflow-hidden">
                <img
                  src={pkg.image}
                  alt={pkg.title}
                  loading="lazy"
                  className="h-full w-full object-cover transition-transform duration-700 ease-out group-hover:scale-105"
                />
                {pkg.popular && (
                  <span className="absolute left-4 top-4 rounded-full bg-white px-3 py-1 text-[11px] font-semibold text-[var(--color-ink)] shadow-sm">
                    Most popular
                  </span>
                )}
              </div>

              <div className="flex flex-1 flex-col p-6">
                <span className="flex h-10 w-10 items-center justify-center rounded-full bg-[var(--color-canvas)] text-[var(--color-ink)]">
                  <pkg.icon size={18} strokeWidth={1.7} />
                </span>

                <h3 className="mt-4 text-lg font-semibold tracking-tight text-[var(--color-ink)]">
                  {pkg.title}
                </h3>
                <p className="mt-1 text-sm text-[var(--color-muted)]">
                  {pkg.shortDesc}
                </p>

                <div className="mt-4 flex items-baseline gap-2">
                  <span className="text-lg font-semibold text-[var(--color-ink)]">
                    {pkg.price}
                  </span>
                  <span className="text-xs text-[var(--color-muted)]">
                    per stay
                  </span>
                </div>

                <button
                  onClick={() => handlePackageInquiry(pkg.title)}
                  className="mt-6 flex w-full items-center justify-center gap-2 rounded-lg border border-[var(--color-line)] py-3 text-sm font-semibold text-[var(--color-ink)] transition-colors hover:bg-[var(--color-canvas)]"
                >
                  Enquire on WhatsApp
                  <ArrowRight size={15} />
                </button>
              </div>
            </article>
          ))}
        </div>

        {/* ---- Concierge CTA ---- */}
        <div className="mt-14 overflow-hidden rounded-2xl bg-[var(--color-ink)] px-8 py-12 text-center md:px-16 md:py-16">
          <h3 className="text-2xl font-semibold tracking-tight text-white md:text-3xl">
            Need more than accommodation?
          </h3>
          <p className="mx-auto mt-3 max-w-xl text-sm leading-relaxed text-white/70">
            Tell our concierge what you have in mind — airport transfers,
            private chefs, decorations, extended stays — and we will arrange it.
          </p>
          <button
            onClick={() => handlePackageInquiry("Custom Concierge Services")}
            className="btn-accent mt-8 rounded-full px-8 py-3.5 text-sm"
          >
            Contact concierge
          </button>
        </div>
      </div>
    </section>
  );
};

export default Packages;
