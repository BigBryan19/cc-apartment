// app/packages/[slug]/page.tsx
// ---------------------------------------------------------------------------
// A single experience.
//
// Handles the four package slugs plus a `/packages/birthday` landing that
// presents the two birthday products side by side, because they are genuinely
// different products and the brief requires them not to be conflated:
//
//   birthday-room-setup   an overnight stay with the room prepared, no visitors
//   birthday-celebration  a hosted birthday with additional attendees
//
// SECTIONS WITH NOTHING TO SHOW SAY SO
//
//   Inclusions, exclusions, eligibility, capacity, notice and cancellation terms
//   are all unset, because no approved content exists. Rather than print an empty
//   list or invent one, each renders a labelled "awaiting confirmation" state and
//   the page carries a single clear notice. `pendingSettings` drives the list, so
//   the page tells the truth automatically as an owner fills the fields in.
// ---------------------------------------------------------------------------

import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  ArrowLeft,
  ArrowUpRight,
  CalendarClock,
  Check,
  Info,
  MessageCircle,
  Minus,
  Sparkles,
  Users,
  X,
} from "lucide-react";
import GuideShell from "../../components/guides/GuideShell";
import JsonLd from "../../components/JsonLd";
import { SITE, SITE_URL, breadcrumbJsonLd, faqJsonLd } from "../../lib/seo";
import { CONTACT, whatsappLink } from "../../lib/contact";
import {
  PACKAGES,
  getPackage,
  primaryActionLabel,
  isInstantlyBookable,
  CATEGORY_LABELS,
} from "../../lib/packages";

/** The four real packages, plus the birthday comparison landing. */
export function generateStaticParams() {
  return [...PACKAGES.map((entry) => ({ slug: entry.slug })), { slug: "birthday" }];
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;

  if (slug === "birthday") {
    return {
      title: "Birthday Celebrations",
      description:
        "Two different birthday products at Cosy Crest: an overnight stay with the room prepared, or a hosted birthday with invited guests.",
      alternates: { canonical: "/packages/birthday" },
    };
  }

  const pkg = getPackage(slug);
  if (!pkg) return { title: "Experience not found" };

  return {
    title: pkg.name,
    description: pkg.summary,
    alternates: { canonical: `/packages/${pkg.slug}` },
    openGraph: {
      type: "article",
      title: `${pkg.name} — ${SITE.shortName}`,
      description: pkg.summary,
      url: `/packages/${pkg.slug}`,
      locale: "en_GH",
      images: [{ url: "/og-cover.jpg", alt: SITE.name }],
    },
  };
}

/** A row of labelled facts, skipping anything unset. */
function Fact({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-0.5">
      <dt className="text-[11px] uppercase tracking-widest text-[var(--color-faint)]">
        {label}
      </dt>
      <dd className="text-sm text-[var(--color-ink)]">{value}</dd>
    </div>
  );
}

/** Shown wherever a required setting has not been supplied. Never a fake value. */
function Pending({ what }: { what: string }) {
  return (
    <p className="flex items-start gap-2 rounded-xl border border-dashed border-[var(--color-line)] bg-[var(--color-canvas)] p-4 text-sm leading-relaxed text-[var(--color-muted)]">
      <Info size={15} className="mt-0.5 shrink-0" aria-hidden="true" />
      <span>
        <span className="font-medium text-[var(--color-ink)]">{what}</span> is being
        confirmed. Ask us and we will tell you exactly where it stands before you commit.
      </span>
    </p>
  );
}

function SectionHeading({ children, id }: { children: React.ReactNode; id: string }) {
  return (
    <h2
      id={id}
      className="text-lg font-semibold tracking-tight text-[var(--color-ink)]"
    >
      {children}
    </h2>
  );
}

/** Birthday is two products; this keeps them visibly separate. */
function BirthdayComparison() {
  const roomSetup = getPackage("birthday-room-setup");
  const hosted = getPackage("birthday-celebration");
  if (!roomSetup || !hosted) notFound();

  return (
    <div className="mt-8 grid gap-5 md:grid-cols-2">
      {[roomSetup, hosted].map((entry) => (
        <Link
          key={entry.slug}
          href={`/packages/${entry.slug}`}
          className="group flex flex-col rounded-2xl border border-[var(--color-line)] bg-white p-6 transition-all duration-200 hover:border-[var(--color-ink)] hover:shadow-[var(--shadow-card)]"
        >
          <h3 className="text-base font-semibold text-[var(--color-ink)]">{entry.name}</h3>
          <p className="mt-3 flex-1 text-sm leading-relaxed text-[var(--color-muted)]">
            {entry.introduction}
          </p>
          <span className="mt-5 inline-flex items-center gap-1 text-xs font-semibold text-[var(--color-ink)]">
            {primaryActionLabel(entry)}
            <ArrowUpRight size={13} aria-hidden="true" />
          </span>
        </Link>
      ))}
    </div>
  );
}

export default async function PackagePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;

  if (slug === "birthday") {
    return (
      <GuideShell>
        <main className="pt-28 md:pt-32">
          <div className="shell max-w-3xl pb-24">
            <Link
              href="/packages"
              className="inline-flex items-center gap-1.5 text-sm text-[var(--color-muted)] transition-colors hover:text-[var(--color-ink)]"
            >
              <ArrowLeft size={14} aria-hidden="true" /> All experiences
            </Link>
            <h1 className="mt-6 text-3xl font-semibold tracking-tight text-[var(--color-ink)] sm:text-4xl">
              Birthday Celebrations
            </h1>
            <p className="mt-4 text-lg leading-relaxed text-[var(--color-muted)]">
              Decorating a room and hosting a party are not the same product. They need
              different information, different properties and different approval, so
              choose the one that matches your plans.
            </p>
            <BirthdayComparison />
          </div>
        </main>
      </GuideShell>
    );
  }

  const pkg = getPackage(slug);
  if (!pkg) notFound();

  const bookable = isInstantlyBookable(pkg);
  const actionLabel = primaryActionLabel(pkg);
  const enquiryHref = `/contact?enquiry=${encodeURIComponent(pkg.slug)}`;

  return (
    <GuideShell>
      <JsonLd
        data={[
          breadcrumbJsonLd([
            { name: "Home", path: "/" },
            { name: "Experiences & Packages", path: "/packages" },
            { name: pkg.name, path: `/packages/${pkg.slug}` },
          ]),
          // Offer is emitted ONLY when a price is genuinely approved and the
          // package can actually be bought. Structured data promising a price the
          // checkout will not honour is worse than no structured data.
          {
            "@context": "https://schema.org",
            "@type": "Service",
            name: pkg.name,
            description: pkg.summary,
            serviceType: CATEGORY_LABELS[pkg.category],
            provider: { "@type": "LodgingBusiness", name: SITE.name, url: SITE_URL },
            url: `${SITE_URL}/packages/${pkg.slug}`,
            ...(bookable && pkg.amount !== null
              ? {
                  offers: {
                    "@type": "Offer",
                    price: pkg.amount,
                    priceCurrency: "GHS",
                    availability: "https://schema.org/InStock",
                  },
                }
              : {}),
          },
          ...(pkg.faqs.length ? [faqJsonLd(pkg.faqs)] : []),
        ]}
      />

      <main className="pt-28 md:pt-32">
        <div className="shell pb-32 md:pb-24">
          <nav aria-label="Breadcrumb" className="mb-6 text-sm">
            <Link href="/" className="text-[var(--color-muted)] hover:text-[var(--color-ink)]">
              Home
            </Link>
            <span className="mx-2 text-[var(--color-faint)]">/</span>
            <Link href="/packages" className="text-[var(--color-muted)] hover:text-[var(--color-ink)]">
              Experiences &amp; Packages
            </Link>
            <span className="mx-2 text-[var(--color-faint)]">/</span>
            <span className="text-[var(--color-ink)]">{pkg.name}</span>
          </nav>

          <div className="grid gap-12 lg:grid-cols-[minmax(0,1fr)_360px] lg:gap-14">
            <div className="min-w-0">
              <header>
                <span className="eyebrow">{CATEGORY_LABELS[pkg.category]}</span>
                <h1 className="mt-2 text-3xl font-semibold tracking-tight text-[var(--color-ink)] sm:text-4xl">
                  {pkg.name}
                </h1>
                <p className="mt-4 text-lg leading-relaxed text-[var(--color-muted)]">
                  {pkg.introduction}
                </p>
              </header>

              {/* Photographs. Real Cosy Crest property photography only — no stock
                  imagery presented as a Cosy Crest setup. Shown once the package
                  has approved images; the property gallery is linked instead. */}
              <section className="mt-10" aria-labelledby="photos">
                <SectionHeading id="photos">Photographs</SectionHeading>
                <div className="mt-4">
                  <Pending what="Package photography" />
                  <p className="mt-3 text-sm text-[var(--color-muted)]">
                    In the meantime,{" "}
                    <Link href="/" className="font-medium text-[var(--color-ink)] underline underline-offset-2">
                      browse the properties
                    </Link>{" "}
                    to see the actual apartments and grounds.
                  </p>
                </div>
              </section>

              <section className="mt-10" aria-labelledby="suits">
                <SectionHeading id="suits">Who this suits</SectionHeading>
                <ul className="mt-4 space-y-2.5">
                  {pkg.whoItsFor.map((line) => (
                    <li key={line} className="flex gap-3 text-sm leading-relaxed text-[var(--color-muted)]">
                      <Check size={16} className="mt-0.5 shrink-0 text-[var(--color-ink)]" aria-hidden="true" />
                      {line}
                    </li>
                  ))}
                </ul>
              </section>

              <section className="mt-10" aria-labelledby="inclusions">
                <SectionHeading id="inclusions">What is included</SectionHeading>
                {pkg.inclusions.length ? (
                  <ul className="mt-4 space-y-2.5">
                    {pkg.inclusions.map((line) => (
                      <li key={line} className="flex gap-3 text-sm text-[var(--color-muted)]">
                        <Check size={16} className="mt-0.5 shrink-0 text-[var(--color-ink)]" aria-hidden="true" />
                        {line}
                      </li>
                    ))}
                  </ul>
                ) : (
                  <div className="mt-4">
                    <Pending what="The inclusion list" />
                  </div>
                )}
              </section>

              {pkg.exclusions.length > 0 && (
                <section className="mt-10" aria-labelledby="exclusions">
                  <SectionHeading id="exclusions">What is not included</SectionHeading>
                  <ul className="mt-4 space-y-2.5">
                    {pkg.exclusions.map((line) => (
                      <li key={line} className="flex gap-3 text-sm text-[var(--color-muted)]">
                        <X size={16} className="mt-0.5 shrink-0 text-[var(--color-faint)]" aria-hidden="true" />
                        {line}
                      </li>
                    ))}
                  </ul>
                </section>
              )}

              <section className="mt-10" aria-labelledby="extras">
                <SectionHeading id="extras">Optional extras</SectionHeading>
                {pkg.extras.length ? (
                  <ul className="mt-4 space-y-2">
                    {pkg.extras.map((extra) => (
                      <li
                        key={extra.id}
                        className="flex items-center justify-between gap-4 rounded-xl border border-[var(--color-line)] bg-white p-4 text-sm"
                      >
                        <span className="text-[var(--color-ink)]">{extra.name}</span>
                        <span className="shrink-0 text-xs text-[var(--color-muted)]">
                          {extra.amount === null ? "Quoted separately" : `GHS ${extra.amount.toLocaleString()}`}
                        </span>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <div className="mt-4">
                    <Pending what="The optional extras list" />
                  </div>
                )}
              </section>

              <section className="mt-10" aria-labelledby="how">
                <SectionHeading id="how">How booking works</SectionHeading>
                <ol className="mt-4 space-y-4">
                  {[
                    "Send us your dates, guest numbers and what you have in mind.",
                    "We check the property, the rules and whether we can stage it.",
                    "You receive an itemised quote: what is included, what it costs, and what is not included.",
                    "Nothing is charged until you accept the quote. Once you have, we confirm your booking.",
                  ].map((step, index) => (
                    <li key={step} className="flex gap-4 text-sm leading-relaxed">
                      <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[var(--color-ink)] text-[11px] font-semibold text-white">
                        {index + 1}
                      </span>
                      <span className="text-[var(--color-muted)]">{step}</span>
                    </li>
                  ))}
                </ol>
              </section>

              <section className="mt-10" aria-labelledby="policy">
                <SectionHeading id="policy">Cancellation &amp; rescheduling</SectionHeading>
                <div className="mt-4">
                  {pkg.cancellationPolicyId ? (
                    <p className="text-sm leading-relaxed text-[var(--color-muted)]">
                      See{" "}
                      <Link href="/terms" className="font-medium text-[var(--color-ink)] underline underline-offset-2">
                        our terms
                      </Link>{" "}
                      for the terms that apply to this booking.
                    </p>
                  ) : (
                    <Pending what="The cancellation and rescheduling terms" />
                  )}
                </div>
              </section>

              {pkg.facilityRules.length > 0 && (
                <section className="mt-10" aria-labelledby="rules">
                  <SectionHeading id="rules">Rules and limits</SectionHeading>
                  <ul className="mt-4 space-y-2.5">
                    {pkg.facilityRules.map((line) => (
                      <li key={line} className="flex gap-3 text-sm text-[var(--color-muted)]">
                        <Minus size={16} className="mt-0.5 shrink-0 text-[var(--color-faint)]" aria-hidden="true" />
                        {line}
                      </li>
                    ))}
                  </ul>
                </section>
              )}

              <section className="mt-10" aria-labelledby="faqs">
                <SectionHeading id="faqs">Questions</SectionHeading>
                <dl className="mt-4 divide-y divide-[var(--color-line)]">
                  {pkg.faqs.map((faq) => (
                    <div key={faq.question} className="py-5">
                      <dt className="text-sm font-semibold text-[var(--color-ink)]">{faq.question}</dt>
                      <dd className="mt-2 text-sm leading-relaxed text-[var(--color-muted)]">{faq.answer}</dd>
                    </div>
                  ))}
                </dl>
              </section>

              {/* The release dependency, stated plainly for the owner as well as
                  the guest. See section 20 of the brief: configuration the owner
                  must still supply. */}
              <section className="mt-10 rounded-2xl border border-amber-200 bg-amber-50 p-6">
                <h2 className="text-sm font-semibold text-amber-900">
                  Still to be confirmed for this experience
                </h2>
                <ul className="mt-3 space-y-1.5">
                  {pkg.pendingSettings.map((item) => (
                    <li key={item} className="flex gap-2 text-sm text-amber-900">
                      <Minus size={15} className="mt-0.5 shrink-0" aria-hidden="true" />
                      {item}
                    </li>
                  ))}
                </ul>
                <p className="mt-4 text-xs leading-relaxed text-amber-800">
                  We have not published figures we cannot stand behind. Send an enquiry and
                  we will confirm each of these for your dates.
                </p>
              </section>
            </div>

            {/* Sidebar / sticky action */}
            <aside className="lg:sticky lg:top-28 lg:self-start">
              <div className="rounded-2xl border border-[var(--color-line)] bg-white p-6">
                <div className="flex items-baseline gap-2">
                  <Sparkles size={16} className="text-[var(--color-ink)]" aria-hidden="true" />
                  <span className="text-lg font-semibold tracking-tight text-[var(--color-ink)]">
                    {pkg.amount !== null ? `From GHS ${pkg.amount.toLocaleString()}` : "Request a quote"}
                  </span>
                </div>
                <p className="mt-1.5 text-xs text-[var(--color-muted)]">
                  {pkg.priceNote ?? "Pricing confirmed on your itemised quote."}
                </p>

                <dl className="mt-5 space-y-3 border-t border-[var(--color-line)] pt-5">
                  <Fact
                    label="Accommodation"
                    value={
                      pkg.eligibility
                        ? pkg.eligibility.accommodationIncluded
                          ? "Included in the package"
                          : "Selected separately"
                        : "Selected as part of the booking"
                    }
                  />
                  <Fact
                    label="Capacity"
                    value={
                      pkg.capacity.maxGuests !== null
                        ? `Up to ${pkg.capacity.maxGuests} guests`
                        : "Confirmed on your quote"
                    }
                  />
                  <Fact
                    label="Minimum notice"
                    value={
                      pkg.minimumNoticeDays !== null
                        ? `${pkg.minimumNoticeDays} days`
                        : "Confirmed on your quote"
                    }
                  />
                  <Fact label="Eligible properties" value="Confirmed on your quote" />
                </dl>

                <a
                  href={enquiryHref}
                  className="mt-6 flex w-full items-center justify-center gap-2 rounded-lg bg-[var(--color-ink)] px-5 py-3.5 text-sm font-semibold text-white transition-opacity hover:opacity-90"
                >
                  {actionLabel}
                </a>

                <a
                  href={whatsappLink(`Hello Cosy Crest — I'd like to ask about the ${pkg.name}.`)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-3 flex w-full items-center justify-center gap-2 rounded-lg border border-[var(--color-line)] px-5 py-3 text-sm font-semibold text-[var(--color-ink)] transition-colors hover:bg-[var(--color-canvas)]"
                >
                  <MessageCircle size={15} aria-hidden="true" />
                  Ask on WhatsApp
                </a>

                <p className="mt-4 flex items-start gap-2 text-[11px] leading-relaxed text-[var(--color-faint)]">
                  <CalendarClock size={13} className="mt-0.5 shrink-0" aria-hidden="true" />
                  {CONTACT.responseNote}
                </p>
              </div>

              {/* Sticky bar for phones. Sits below the floating WhatsApp button so
                  the two do not overlap. */}
              <div className="fixed inset-x-0 bottom-0 z-40 border-t border-[var(--color-line)] bg-white/95 p-3 backdrop-blur-sm lg:hidden">
                <div className="flex items-center gap-3">
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-xs text-[var(--color-muted)]">{pkg.name}</p>
                    <p className="text-sm font-semibold text-[var(--color-ink)]">
                      {pkg.amount !== null ? `From GHS ${pkg.amount.toLocaleString()}` : "Request a quote"}
                    </p>
                  </div>
                  <a
                    href={enquiryHref}
                    className="shrink-0 rounded-lg bg-[var(--color-ink)] px-4 py-2.5 text-sm font-semibold text-white"
                  >
                    {pkg.mode === "quotation" ? "Enquire" : "Book"}
                  </a>
                </div>
              </div>
            </aside>
          </div>
        </div>
      </main>
    </GuideShell>
  );
}
