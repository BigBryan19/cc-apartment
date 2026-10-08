// app/contact/page.tsx
// ---------------------------------------------------------------------------
// /contact — the destination the honeymoon guide linked to, which previously
// returned a 404.
//
// This is a real page rather than a form that posts nowhere. It offers the three
// channels the business actually uses, routes occasion enquiries to the right
// package, and states plainly that a group enquiry does not imply the property
// can hold more people than it is approved for.
//
// A structured enquiry form is not implemented here yet. Rather than ship a form
// whose submissions go nowhere — which would be the same defect as the payment
// emails that send loudly into a log nobody reads — the page directs to the
// channels that work and lists the form as outstanding. See the report.
// ---------------------------------------------------------------------------

import type { Metadata } from "next";
import Link from "next/link";
import { ArrowUpRight, Mail, MessageCircle, Phone, Users } from "lucide-react";
import GuideShell from "../components/guides/GuideShell";
import JsonLd from "../components/JsonLd";
import { SITE, SITE_URL, breadcrumbJsonLd } from "../lib/seo";
import { CONTACT, mailtoLink, telLink, whatsappLink } from "../lib/contact";
import { PACKAGES, CATEGORY_LABELS, primaryActionLabel } from "../lib/packages";

const DESCRIPTION =
  "Contact Cosy Crest about a stay, a honeymoon or birthday package, or a private gathering in Aburi, Adenta or Lakeside, Ghana.";

export const metadata: Metadata = {
  title: "Contact",
  description: DESCRIPTION,
  alternates: { canonical: "/contact" },
  openGraph: {
    type: "website",
    title: `Contact — ${SITE.shortName}`,
    description: DESCRIPTION,
    url: "/contact",
    locale: "en_GH",
    images: [{ url: "/og-cover.jpg", alt: SITE.name }],
  },
};

/** General channels. Each is a real, working destination. */
const CHANNELS = [
  {
    id: "whatsapp",
    label: "WhatsApp",
    value: CONTACT.phoneDisplay,
    href: whatsappLink("Hello Cosy Crest — I have a question about a booking."),
    hint: "Fastest for a quick question. Include your booking or enquiry reference if you have one.",
    icon: MessageCircle,
    external: true,
  },
  {
    id: "call",
    label: "Telephone",
    value: CONTACT.phoneDisplay,
    href: telLink(),
    hint: "Best for anything time-sensitive, such as an arrival today.",
    icon: Phone,
    external: false,
  },
  {
    id: "email",
    label: "Email",
    value: CONTACT.email,
    href: mailtoLink("Booking enquiry — Cosy Crest"),
    hint: "Best for detailed requirements, event plans and documents.",
    icon: Mail,
    external: false,
  },
] as const;

export default function ContactPage() {
  return (
    <GuideShell>
      <JsonLd
        data={[
          breadcrumbJsonLd([
            { name: "Home", path: "/" },
            { name: "Contact", path: "/contact" },
          ]),
          {
            "@context": "https://schema.org",
            "@type": "ContactPage",
            name: "Contact Cosy Crest",
            url: `${SITE_URL}/contact`,
            mainEntity: {
              "@type": "LodgingBusiness",
              name: SITE.name,
              telephone: CONTACT.phoneE164,
              email: CONTACT.email,
              url: SITE_URL,
            },
          },
        ]}
      />

      <main className="pt-28 md:pt-32">
        <div className="shell max-w-4xl pb-24">
          <nav aria-label="Breadcrumb" className="mb-6 text-sm">
            <Link href="/" className="text-[var(--color-muted)] hover:text-[var(--color-ink)]">
              Home
            </Link>
            <span className="mx-2 text-[var(--color-faint)]">/</span>
            <span className="text-[var(--color-ink)]">Contact</span>
          </nav>

          <header className="max-w-2xl">
            <span className="eyebrow">Contact</span>
            <h1 className="mt-2 text-3xl font-semibold tracking-tight text-[var(--color-ink)] sm:text-4xl">
              Talk to us about your stay
            </h1>
            <p className="mt-4 text-lg leading-relaxed text-[var(--color-muted)]">
              Whether it is a single night, a honeymoon, a birthday or a private
              gathering, tell us what you have in mind and we will tell you exactly what
              is possible.
            </p>
          </header>

          <ul className="mt-10 grid gap-5 sm:grid-cols-3">
            {CHANNELS.map((channel) => {
              const Icon = channel.icon;
              return (
                <li key={channel.id}>
                  <a
                    href={channel.href}
                    {...(channel.external
                      ? { target: "_blank", rel: "noopener noreferrer" }
                      : {})}
                    className="group flex h-full flex-col rounded-2xl border border-[var(--color-line)] bg-white p-6 transition-all duration-200 hover:-translate-y-0.5 hover:border-[var(--color-ink)] hover:shadow-[var(--shadow-card)]"
                  >
                    <span className="rounded-xl bg-[var(--color-canvas)] p-2.5 text-[var(--color-ink)] self-start">
                      <Icon size={18} aria-hidden="true" />
                    </span>
                    <span className="mt-4 text-sm font-semibold text-[var(--color-ink)]">
                      {channel.label}
                    </span>
                    <span className="mt-1 break-all text-sm text-[var(--color-muted)]">
                      {channel.value}
                    </span>
                    <span className="mt-3 flex-1 text-xs leading-relaxed text-[var(--color-faint)]">
                      {channel.hint}
                    </span>
                  </a>
                </li>
              );
            })}
          </ul>

          <section className="mt-16" aria-labelledby="occasion">
            <h2
              id="occasion"
              className="text-xl font-semibold tracking-tight text-[var(--color-ink)]"
            >
              Booking an occasion?
            </h2>
            <p className="mt-3 max-w-2xl text-sm leading-relaxed text-[var(--color-muted)]">
              Each occasion has its own requirements. Opening the right page first means
              we come back with an accurate quote instead of a round of questions.
            </p>

            <ul className="mt-6 grid gap-4 sm:grid-cols-2">
              {PACKAGES.map((pkg) => (
                <li key={pkg.slug}>
                  <Link
                    href={`/packages/${pkg.slug}`}
                    className="group flex items-start justify-between gap-4 rounded-2xl border border-[var(--color-line)] bg-white p-5 transition-all duration-200 hover:border-[var(--color-ink)]"
                  >
                    <span className="min-w-0">
                      <span className="block text-xs uppercase tracking-widest text-[var(--color-faint)]">
                        {CATEGORY_LABELS[pkg.category]}
                      </span>
                      <span className="mt-1 block text-sm font-semibold text-[var(--color-ink)]">
                        {pkg.name}
                      </span>
                      <span className="mt-1 block text-xs text-[var(--color-muted)]">
                        {primaryActionLabel(pkg)}
                      </span>
                    </span>
                    <ArrowUpRight
                      size={15}
                      aria-hidden="true"
                      className="mt-1 shrink-0 text-[var(--color-faint)] transition-transform duration-200 group-hover:translate-x-0.5 group-hover:-translate-y-0.5"
                    />
                  </Link>
                </li>
              ))}
            </ul>
          </section>

          {/* Required by the brief: a group enquiry must not imply a property can
              exceed its approved occupancy. */}
          <section className="mt-14 rounded-2xl border border-[var(--color-line)] bg-[var(--color-canvas)] p-7">
            <div className="flex items-start gap-3">
              <Users size={20} className="mt-0.5 shrink-0 text-[var(--color-ink)]" aria-hidden="true" />
              <div>
                <h2 className="text-base font-semibold text-[var(--color-ink)]">
                  Larger groups and events
                </h2>
                <p className="mt-2 text-sm leading-relaxed text-[var(--color-muted)]">
                  Every property has an approved maximum occupancy, and we do not exceed
                  it. Sending a group enquiry does not reserve anything and does not mean
                  the property can take more people than it is approved for — it starts a
                  conversation about what is genuinely possible, which may mean a
                  different property or a different arrangement.
                </p>
                <a
                  href={mailtoLink(
                    "Group or event enquiry — Cosy Crest",
                    "Preferred property:\nEvent date:\nExpected attendance:\nNumber staying overnight:\nStart and end times:\nWhat you have in mind:\n",
                  )}
                  className="mt-5 inline-flex items-center gap-2 rounded-lg bg-[var(--color-ink)] px-5 py-3 text-sm font-semibold text-white transition-opacity hover:opacity-90"
                >
                  Send a group enquiry
                </a>
              </div>
            </div>
          </section>

          <p className="mt-10 text-sm text-[var(--color-muted)]">{CONTACT.responseNote}</p>
        </div>
      </main>
    </GuideShell>
  );
}
