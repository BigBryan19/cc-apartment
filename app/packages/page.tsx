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
import { Quote } from "lucide-react";
import GuideShell from "../components/guides/GuideShell";
import JsonLd from "../components/JsonLd";
import { SITE, SITE_URL, breadcrumbJsonLd } from "../lib/seo";
import { PACKAGES } from "../lib/packages";
import PackagesClient from "./PackagesClient";

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

          <div className="mt-10 flex max-w-3xl gap-3 rounded-2xl border border-amber-200 bg-amber-50 p-5 text-sm leading-relaxed text-amber-900">
            <Quote size={18} className="mt-0.5 shrink-0" aria-hidden="true" />
            <p>
              Every experience below is arranged by enquiry while we finalise pricing
              and inclusions. Send us your dates and what you have in mind, and we will
              come back with an itemised quote — nothing is charged until you accept it.
            </p>
          </div>

          <PackagesClient />

          <section className="mt-20 rounded-2xl border border-[var(--color-line)] bg-[var(--color-canvas)] p-7">
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
