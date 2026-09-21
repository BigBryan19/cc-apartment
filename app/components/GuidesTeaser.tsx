// app/components/GuidesTeaser.tsx
// ---------------------------------------------------------------------------
// Surfaces a few guides on the homepage.
//
// This is as much an SEO device as a content block: internal links from the
// strongest page on the site are how a crawler discovers the guides and how
// authority reaches them. Deliberately limited to three so it reads as a
// recommendation rather than a link farm.
// ---------------------------------------------------------------------------

import React from "react";
import Link from "next/link";
import { ArrowUpRight } from "lucide-react";

const FEATURED = [
  "where-to-stay-in-accra",
  "staying-in-aburi",
  "what-a-short-let-includes",
];

import { GUIDES } from "../lib/guides";

const GuidesTeaser: React.FC = () => {
  const featured = FEATURED.map((slug) =>
    GUIDES.find((guide) => guide.slug === slug),
  ).filter((guide): guide is NonNullable<typeof guide> => Boolean(guide));

  if (featured.length === 0) return null;

  return (
    <section className="section-y bg-white">
      <div className="shell">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <span className="eyebrow">Guides</span>
            <h2 className="mt-2 text-3xl font-semibold tracking-tight text-[var(--color-ink)] sm:text-4xl">
              Planning a trip to Ghana?
            </h2>
            <p className="mt-2 max-w-xl text-sm leading-relaxed text-[var(--color-muted)]">
              Straight answers about where to stay, what a short let includes,
              and the best time to come.
            </p>
          </div>

          <Link
            href="/guides"
            className="inline-flex items-center gap-1.5 text-sm font-semibold text-[var(--color-ink)] transition-opacity hover:opacity-70"
          >
            All guides <ArrowUpRight size={15} />
          </Link>
        </div>

        <ul className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {featured.map((guide) => (
            <li key={guide.slug}>
              <Link
                href={`/guides/${guide.slug}`}
                className="group flex h-full flex-col rounded-2xl border border-[var(--color-line)] bg-white p-6 transition-all duration-200 hover:-translate-y-0.5 hover:border-[var(--color-ink)] hover:shadow-[var(--shadow-card)]"
              >
                <span className="eyebrow mb-3">{guide.category}</span>
                <h3 className="text-base font-semibold leading-snug text-[var(--color-ink)]">
                  {guide.title}
                </h3>
                <p className="mt-3 flex-1 text-sm leading-relaxed text-[var(--color-muted)]">
                  {guide.description}
                </p>
                <span className="mt-5 text-xs font-semibold text-[var(--color-ink)]">
                  Read the guide
                </span>
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
};

export default GuidesTeaser;
