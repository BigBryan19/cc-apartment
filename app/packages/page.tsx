// app/packages/page.tsx
// ---------------------------------------------------------------------------
// Experiences & Packages overview.
//
// This route did not exist, which is why the honeymoon guide's link to
// /packages returned a 404 and why packages were effectively undiscoverable —
// they appeared nowhere in the navigation.
//
// Every package currently renders as an enquiry. Nothing here advertises a price
// that has not been approved, so the cards say "Request a quote" and explain what
// happens next rather than showing a figure nobody agreed to.
// ---------------------------------------------------------------------------

import type { Metadata } from "next";
import Link from "next/link";
import { ArrowUpRight, BedDouble, CalendarHeart, Cake, PartyPopper, Quote } from "lucide-react";
import GuideShell from "../components/guides/GuideShell";
import JsonLd from "../components/JsonLd";
import { SITE, SITE_URL, breadcrumbJsonLd } from "../lib/seo";
import { PACKAGES, primaryActionLabel, type PackageCategory } from "../lib/packages";

const DESCRIPTION =
  "Honeymoon and romantic getaways, birthday stays and celebrations, and private gatherings at Cosy Crest apartments in Aburi, Adenta and Lakeside, Ghana.";

export const metadata: Metadata = {
  title: "Experiences & Packages",
  description: DESCRIPTION,
  alternates: { canonical: "/packages" },
  openGraph: {
    type: "website",
    title: `Experiences & Packages — ${SITE.shortName}`,
    description: DESCRIPTION,
    url: "/packages",
    locale: "en_GH",
    images: [{ url: "/og-cover.jpg", alt: SITE.name }],
  },
};

const CATEGORY_ICON: Record<PackageCategory, typeof BedDouble> = {
  honeymoon: CalendarHeart,
  birthday: Cake,
  private_gathering: PartyPopper,
};

const CATEGORY_ORDER: PackageCategory[] = ["honeymoon", "birthday", "private_gathering"];

const CATEGORY_INTRO: Record<PackageCategory, { title: string; blurb: string }> = {
  honeymoon: {
    title: "Honeymoon & Romance",
    blurb: "A private, quietly staged stay for two.",
  },
  birthday: {
    title: "Birthday Celebrations",
    blurb:
      "Two different things: an overnight stay with the room prepared, or a birthday with invited guests. They have different requirements.",
  },
  private_gathering: {
    title: "Private Gatherings",
    blurb: "A casual party or private function at one of our properties, by approval.",
  },
};

/** What the guest is told to expect, per package, without promising anything. */
function accommodationNote(slug: string): string {
  if (slug === "birthday-celebration" || slug === "private-gathering") {
    return "Accommodation for attendees is quoted separately from the event itself.";
  }
  return "Accommodation is selected as part of the booking.";
}

export default function PackagesPage() {
  return (
    <GuideShell>
      <JsonLd
        data={[
          breadcrumbJsonLd([
            { name: "Home", path: "/" },
            { name: "Experiences & Packages", path: "/packages" },
          ]),
          {
            "@context": "https://schema.org",
            "@type": "CollectionPage",
            name: "Experiences & Packages",
            description: DESCRIPTION,
            url: `${SITE_URL}/packages`,
            // ItemList of the packages, described only by what is actually
            // published. No offers are emitted because no price is approved yet:
            // structured data that advertises a price the site will not honour is
            // worse than none.
            hasPart: PACKAGES.map((entry) => ({
              "@type": "Service",
              name: entry.name,
              description: entry.summary,
              serviceType: entry.category,
            })),
          },
        ]}
      />

      <main className="pt-28 md:pt-32">
        <div className="shell pb-24">
          <nav aria-label="Breadcrumb" className="mb-6 text-sm">
            <Link href="/" className="text-[var(--color-muted)] transition-colors hover:text-[var(--color-ink)]">
              Home
            </Link>
            <span className="mx-2 text-[var(--color-faint)]">/</span>
            <span className="text-[var(--color-ink)]">Experiences &amp; Packages</span>
          </nav>

          <header className="max-w-3xl">
            <span className="eyebrow">Experiences</span>
            <h1 className="mt-2 text-3xl font-semibold tracking-tight text-[var(--color-ink)] sm:text-4xl">
              Stays with something arranged around them
            </h1>
            <p className="mt-4 text-lg leading-relaxed text-[var(--color-muted)]">
              {DESCRIPTION}
            </p>
          </header>

          {/* A notice, not a sales line. The packages are real; the prices and
              inclusions are still being agreed, and saying so is better than
              implying a bookable rate exists. */}
          <div className="mt-10 flex max-w-3xl gap-3 rounded-2xl border border-amber-200 bg-amber-50 p-5 text-sm leading-relaxed text-amber-900">
            <Quote size={18} className="mt-0.5 shrink-0" aria-hidden="true" />
            <p>
              Every experience below is arranged by enquiry while we finalise pricing
              and inclusions. Send us your dates and what you have in mind, and we will
              come back with an itemised quote — what is included, what it costs and
              what we need from you. Nothing is charged until you accept it.
            </p>
          </div>

          {CATEGORY_ORDER.map((category) => {
            const entries = PACKAGES.filter((entry) => entry.category === category);
            if (!entries.length) return null;
            const Icon = CATEGORY_ICON[category];
            const intro = CATEGORY_INTRO[category];

            return (
              <section key={category} className="mt-16" aria-labelledby={`category-${category}`}>
                <div className="flex items-start gap-3">
                  <span className="mt-0.5 rounded-xl bg-[var(--color-canvas)] p-2.5 text-[var(--color-ink)]">
                    <Icon size={20} aria-hidden="true" />
                  </span>
                  <div>
                    <h2
                      id={`category-${category}`}
                      className="text-xl font-semibold tracking-tight text-[var(--color-ink)]"
                    >
                      {intro.title}
                    </h2>
                    <p className="mt-1 max-w-2xl text-sm leading-relaxed text-[var(--color-muted)]">
                      {intro.blurb}
                    </p>
                  </div>
                </div>

                <ul className="mt-6 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
                  {entries.map((entry) => (
                    <li key={entry.slug}>
                      <Link
                        href={`/packages/${entry.slug}`}
                        className="group flex h-full flex-col rounded-2xl border border-[var(--color-line)] bg-white p-6 transition-all duration-200 hover:-translate-y-0.5 hover:border-[var(--color-ink)] hover:shadow-[var(--shadow-card)]"
                      >
                        <h3 className="text-base font-semibold leading-snug text-[var(--color-ink)]">
                          {entry.name}
                        </h3>
                        <p className="mt-3 flex-1 text-sm leading-relaxed text-[var(--color-muted)]">
                          {entry.summary}
                        </p>

                        <dl className="mt-4 space-y-1.5 text-xs">
                          <div className="flex gap-2">
                            <dt className="text-[var(--color-faint)]">Accommodation</dt>
                            <dd className="text-[var(--color-ink)]">
                              {accommodationNote(entry.slug)}
                            </dd>
                          </div>
                          <div className="flex gap-2">
                            <dt className="text-[var(--color-faint)]">Price</dt>
                            {/* Honest: no approved figure exists, so none is shown. */}
                            <dd className="text-[var(--color-ink)]">Request a quote</dd>
                          </div>
                        </dl>

                        <span className="mt-5 inline-flex items-center gap-1 text-xs font-semibold text-[var(--color-ink)]">
                          {primaryActionLabel(entry)}
                          <ArrowUpRight
                            size={13}
                            aria-hidden="true"
                            className="transition-transform duration-200 group-hover:translate-x-0.5 group-hover:-translate-y-0.5"
                          />
                        </span>
                      </Link>
                    </li>
                  ))}
                </ul>
              </section>
            );
          })}

          <section className="mt-16 rounded-2xl border border-[var(--color-line)] bg-[var(--color-canvas)] p-7">
            <h2 className="text-lg font-semibold tracking-tight text-[var(--color-ink)]">
              Travelling with a larger group?
            </h2>
            <p className="mt-3 max-w-2xl text-sm leading-relaxed text-[var(--color-muted)]">
              Each property has an approved maximum occupancy and we cannot exceed it.
              If your party is larger than what our stays accommodate, send us a group
              enquiry and we will tell you honestly what is possible.
            </p>
            <div className="mt-5 flex flex-wrap gap-3">
              <Link
                href="/contact"
                className="rounded-lg bg-[var(--color-ink)] px-5 py-3 text-sm font-semibold text-white transition-opacity hover:opacity-90"
              >
                Contact us
              </Link>
              <Link
                href="/packages/private-gathering"
                className="rounded-lg border border-[var(--color-line)] bg-white px-5 py-3 text-sm font-semibold text-[var(--color-ink)] transition-colors hover:bg-[var(--color-canvas)]"
              >
                Plan your gathering
              </Link>
            </div>
          </section>
        </div>
      </main>
    </GuideShell>
  );
}
