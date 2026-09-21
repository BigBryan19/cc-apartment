// app/guides/page.tsx
// ---------------------------------------------------------------------------
// Index of every guide. Server-rendered, so the full list of internal links is
// in the initial HTML.
// ---------------------------------------------------------------------------

import type { Metadata } from "next";
import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import GuideShell from "../components/guides/GuideShell";
import JsonLd from "../components/JsonLd";
import { GUIDES, guidesByCategory } from "../lib/guides";
import { SITE, SITE_URL, breadcrumbJsonLd } from "../lib/seo";

const DESCRIPTION =
  "Practical guides to staying in Ghana — where to stay in Accra, what a short let includes, the best time to visit, and what to expect in Aburi, Adenta and Lakeside Estate.";

export const metadata: Metadata = {
  title: "Guides to staying in Ghana",
  description: DESCRIPTION,
  alternates: { canonical: "/guides" },
  openGraph: {
    type: "website",
    title: `Guides to staying in Ghana — ${SITE.shortName}`,
    description: DESCRIPTION,
    url: "/guides",
    locale: "en_GH",
    images: [{ url: "/hero-bg.png", alt: SITE.name }],
  },
  twitter: {
    card: "summary_large_image",
    title: `Guides to staying in Ghana — ${SITE.shortName}`,
    description: DESCRIPTION,
    images: ["/hero-bg.png"],
  },
};

export default function GuidesIndexPage() {
  const groups = guidesByCategory();

  return (
    <GuideShell>
      <JsonLd
        data={[
          breadcrumbJsonLd([
            { name: "Home", path: "/" },
            { name: "Guides", path: "/guides" },
          ]),
          {
            "@context": "https://schema.org",
            "@type": "CollectionPage",
            name: "Guides to staying in Ghana",
            description: DESCRIPTION,
            url: `${SITE_URL}/guides`,
            hasPart: GUIDES.map((guide) => ({
              "@type": "Article",
              headline: guide.title,
              description: guide.description,
            })),
          },
        ]}
      />

      <main className="pt-28 md:pt-32">
        <div className="shell pb-24">
          <nav aria-label="Breadcrumb" className="mb-6 text-sm">
            <Link
              href="/"
              className="text-[var(--color-muted)] transition-colors hover:text-[var(--color-ink)]"
            >
              Home
            </Link>
            <span className="mx-2 text-[var(--color-faint)]">/</span>
            <span className="text-[var(--color-ink)]">Guides</span>
          </nav>

          <header className="max-w-3xl">
            <span className="eyebrow">Guides</span>
            <h1 className="mt-2 text-3xl font-semibold tracking-tight text-[var(--color-ink)] sm:text-4xl">
              Staying in Ghana, explained
            </h1>
            <p className="mt-4 text-lg leading-relaxed text-[var(--color-muted)]">
              {DESCRIPTION}
            </p>
          </header>

          {groups.map((group) => (
            <section key={group.category} className="mt-16">
              <h2 className="mb-6 text-xl font-semibold tracking-tight text-[var(--color-ink)]">
                {group.category}
              </h2>

              <ul className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
                {group.guides.map((guide) => (
                  <li key={guide.slug}>
                    <Link
                      href={`/guides/${guide.slug}`}
                      className="group flex h-full flex-col rounded-2xl border border-[var(--color-line)] bg-white p-6 transition-all duration-200 hover:-translate-y-0.5 hover:border-[var(--color-ink)] hover:shadow-[var(--shadow-card)]"
                    >
                      <h3 className="text-base font-semibold leading-snug text-[var(--color-ink)]">
                        {guide.title}
                      </h3>
                      <p className="mt-3 flex-1 text-sm leading-relaxed text-[var(--color-muted)]">
                        {guide.description}
                      </p>
                      <span className="mt-5 inline-flex items-center gap-1 text-xs font-semibold text-[var(--color-ink)]">
                        Read the guide
                        <ArrowUpRight
                          size={13}
                          className="transition-transform duration-200 group-hover:translate-x-0.5 group-hover:-translate-y-0.5"
                        />
                      </span>
                      <span className="mt-2 text-xs text-[var(--color-faint)]">
                        {guide.readingMinutes} min read
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>
      </main>
    </GuideShell>
  );
}
