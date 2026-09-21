// app/guides/[slug]/page.tsx
// ---------------------------------------------------------------------------
// A single guide.
//
// Server component throughout: the body copy has to be in the initial HTML for
// a crawler to read it, so nothing here may become client-rendered.
// ---------------------------------------------------------------------------

import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowUpRight, CalendarDays, Clock } from "lucide-react";
import GuideShell from "../../components/guides/GuideShell";
import GuideProse from "../../components/guides/GuideProse";
import JsonLd from "../../components/JsonLd";
import { GUIDES, getGuide, relatedGuides } from "../../lib/guides";
import { SITE, SITE_URL, breadcrumbJsonLd } from "../../lib/seo";

export function generateStaticParams() {
  return GUIDES.map((guide) => ({ slug: guide.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const guide = getGuide(slug);

  if (!guide) {
    return {
      title: "Guide not found",
      robots: { index: false, follow: true },
    };
  }

  const path = `/guides/${guide.slug}`;

  return {
    title: guide.metaTitle ?? guide.title,
    description: guide.description,
    keywords: guide.keywords,
    alternates: { canonical: path },
    openGraph: {
      type: "article",
      title: guide.metaTitle ?? guide.title,
      description: guide.description,
      url: path,
      siteName: SITE.name,
      locale: "en_GH",
      publishedTime: guide.updated,
      modifiedTime: guide.updated,
      images: [{ url: "/hero-bg.png", alt: SITE.name }],
    },
    twitter: {
      card: "summary_large_image",
      title: guide.metaTitle ?? guide.title,
      description: guide.description,
      images: ["/hero-bg.png"],
    },
  };
}

function formatDate(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString("en-GB", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

export default async function GuidePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const guide = getGuide(slug);

  if (!guide) notFound();

  const related = relatedGuides(guide, 3);
  const url = `${SITE_URL}/guides/${guide.slug}`;

  return (
    <GuideShell>
      <JsonLd
        data={[
          {
            "@context": "https://schema.org",
            "@type": "Article",
            "@id": `${url}/#article`,
            headline: guide.title,
            description: guide.description,
            articleSection: guide.category,
            keywords: guide.keywords.join(", "),
            inLanguage: "en",
            datePublished: guide.updated,
            dateModified: guide.updated,
            mainEntityOfPage: { "@type": "WebPage", "@id": url },
            author: { "@id": `${SITE_URL}/#organization` },
            publisher: { "@id": `${SITE_URL}/#organization` },
            image: `${SITE_URL}/hero-bg.png`,
          },
          breadcrumbJsonLd([
            { name: "Home", path: "/" },
            { name: "Guides", path: "/guides" },
            { name: guide.title, path: `/guides/${guide.slug}` },
          ]),
        ]}
      />

      <main className="pt-28 md:pt-32">
        <article className="shell pb-24">
          <nav aria-label="Breadcrumb" className="mb-6 text-sm">
            <Link
              href="/"
              className="text-[var(--color-muted)] transition-colors hover:text-[var(--color-ink)]"
            >
              Home
            </Link>
            <span className="mx-2 text-[var(--color-faint)]">/</span>
            <Link
              href="/guides"
              className="text-[var(--color-muted)] transition-colors hover:text-[var(--color-ink)]"
            >
              Guides
            </Link>
            <span className="mx-2 text-[var(--color-faint)]">/</span>
            <span className="text-[var(--color-ink)]">{guide.category}</span>
          </nav>

          {/* The reading column is centred at ~48rem for a comfortable measure,
              while the related-guides grid below stays full width. */}
          <header className="mx-auto max-w-3xl">
            <span className="eyebrow">{guide.category}</span>
            <h1 className="mt-2 text-3xl font-semibold leading-tight tracking-tight text-[var(--color-ink)] sm:text-4xl">
              {guide.title}
            </h1>
            <p className="mt-5 text-lg leading-relaxed text-[var(--color-muted)]">
              {guide.summary}
            </p>

            <div className="mt-6 flex flex-wrap items-center gap-x-5 gap-y-2 border-y border-[var(--color-line-soft)] py-3 text-xs text-[var(--color-faint)]">
              <span className="inline-flex items-center gap-1.5">
                <CalendarDays size={13} /> Updated {formatDate(guide.updated)}
              </span>
              <span className="inline-flex items-center gap-1.5">
                <Clock size={13} /> {guide.readingMinutes} min read
              </span>
            </div>
          </header>

          <div className="mx-auto mt-12 max-w-3xl">
            {guide.sections.map((section, sectionIndex) => (
              <section key={section.heading} className="mb-11">
                <h2 className="mb-4 text-xl font-semibold tracking-tight text-[var(--color-ink)]">
                  {section.heading}
                </h2>

                {section.paragraphs?.map((paragraph, paragraphIndex) => (
                  <p
                    key={`${sectionIndex}-${paragraphIndex}`}
                    className="mb-4 leading-relaxed text-[var(--color-muted)]"
                  >
                    <GuideProse
                      text={paragraph}
                      id={`${sectionIndex}-${paragraphIndex}`}
                    />
                  </p>
                ))}

                {section.list && (
                  <ul className="my-4 space-y-2.5">
                    {section.list.map((item, itemIndex) => (
                      <li
                        key={itemIndex}
                        className="relative pl-5 leading-relaxed text-[var(--color-muted)] before:absolute before:left-0 before:top-[0.6em] before:h-1.5 before:w-1.5 before:rounded-full before:bg-[var(--color-accent)]"
                      >
                        <GuideProse
                          text={item}
                          id={`${sectionIndex}-l${itemIndex}`}
                        />
                      </li>
                    ))}
                  </ul>
                )}
              </section>
            ))}
          </div>

          {/* Call to action */}
          {guide.cta && (
            <aside className="mx-auto mt-4 max-w-3xl rounded-2xl border border-[var(--color-line)] bg-[var(--color-canvas)] p-7">
              <p className="text-lg font-semibold tracking-tight text-[var(--color-ink)]">
                {guide.cta.note ?? "Ready when you are."}
              </p>
              <Link
                href={guide.cta.href}
                className="btn-accent mt-4 inline-flex items-center gap-2 rounded-xl px-5 py-3 text-sm"
              >
                {guide.cta.label}
                <ArrowUpRight size={15} />
              </Link>
            </aside>
          )}

          {/* Related guides — also the internal links that let a crawler
              discover the rest of the section. */}
          {related.length > 0 && (
            <section className="mt-16">
              <h2 className="mb-6 text-xl font-semibold tracking-tight text-[var(--color-ink)]">
                Keep reading
              </h2>
              <ul className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
                {related.map((item) => (
                  <li key={item.slug}>
                    <Link
                      href={`/guides/${item.slug}`}
                      className="group flex h-full flex-col rounded-2xl border border-[var(--color-line)] bg-white p-6 transition-all duration-200 hover:-translate-y-0.5 hover:border-[var(--color-ink)] hover:shadow-[var(--shadow-card)]"
                    >
                      <h3 className="text-base font-semibold leading-snug text-[var(--color-ink)]">
                        {item.title}
                      </h3>
                      <p className="mt-3 flex-1 text-sm leading-relaxed text-[var(--color-muted)]">
                        {item.description}
                      </p>
                      <span className="mt-5 text-xs font-semibold text-[var(--color-ink)]">
                        Read the guide
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
          )}
        </article>
      </main>
    </GuideShell>
  );
}
