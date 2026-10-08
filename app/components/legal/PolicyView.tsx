// app/components/legal/PolicyView.tsx
// ---------------------------------------------------------------------------
// Shared renderer for /terms, /privacy and /imprint.
//
// Renders approved wording where it exists and an honest, structured "awaiting
// approval" state where it does not. The alternative — publishing invented legal
// terms, or leaving the footer pointed at "#" — is what this replaces.
//
// The pending state is deliberately informative rather than a placeholder: it
// lists what the section will cover and, in a collapsible block for staff, the
// specific decision the owner must make. A guest sees a clear statement about
// where things stand; an owner sees their checklist.
// ---------------------------------------------------------------------------

import Link from "next/link";
import { CheckCircle2, CircleDashed, ScrollText } from "lucide-react";
import GuideShell from "../guides/GuideShell";
import JsonLd from "../JsonLd";
import { SITE, breadcrumbJsonLd } from "../../lib/seo";
import { CONTACT, mailtoLink } from "../../lib/contact";
import { policyCompleteness, type Policy } from "../../lib/policies";

export default function PolicyView({ policy }: { policy: Policy }) {
  const completeness = policyCompleteness(policy);

  return (
    <GuideShell>
      <JsonLd
        data={breadcrumbJsonLd([
          { name: "Home", path: "/" },
          { name: policy.title, path: `/${policy.slug}` },
        ])}
      />

      <main className="pt-28 md:pt-32">
        <div className="shell max-w-3xl pb-24">
          <nav aria-label="Breadcrumb" className="mb-6 text-sm">
            <Link href="/" className="text-[var(--color-muted)] hover:text-[var(--color-ink)]">
              Home
            </Link>
            <span className="mx-2 text-[var(--color-faint)]">/</span>
            <span className="text-[var(--color-ink)]">{policy.title}</span>
          </nav>

          <header>
            <span className="eyebrow">Policy</span>
            <h1 className="mt-2 text-3xl font-semibold tracking-tight text-[var(--color-ink)] sm:text-4xl">
              {policy.title}
            </h1>
            <p className="mt-4 text-lg leading-relaxed text-[var(--color-muted)]">
              {policy.summary}
            </p>
            <p className="mt-3 text-xs text-[var(--color-faint)]">
              {policy.lastReviewed
                ? `Last reviewed ${policy.lastReviewed}.`
                : "Not yet reviewed or approved."}
            </p>
          </header>

          {/* Honest status. Hidden entirely once every section is approved, so the
              page becomes a normal policy document with no scaffolding left. */}
          {!completeness.ready && (
            <div className="mt-8 flex gap-3 rounded-2xl border border-amber-200 bg-amber-50 p-5 text-sm leading-relaxed text-amber-900">
              <ScrollText size={18} className="mt-0.5 shrink-0" aria-hidden="true" />
              <div>
                <p className="font-medium">
                  This notice is being finalised ({completeness.approved} of{" "}
                  {completeness.total} sections approved).
                </p>
                <p className="mt-2">
                  We have not published wording we cannot stand behind. Each section below
                  states what it will cover. If you need a definitive answer on any point
                  before you book — cancellation, refunds, deposits, visitors or event
                  rules — ask us and we will confirm it in writing for your specific
                  booking.
                </p>
                <a
                  href={mailtoLink(
                    `Question about ${policy.title} — Cosy Crest`,
                    "The point I would like confirmed:\n",
                  )}
                  className="mt-3 inline-block font-semibold underline underline-offset-2"
                >
                  Ask about {policy.title.toLowerCase()}
                </a>
              </div>
            </div>
          )}

          <div className="mt-12 space-y-10">
            {policy.sections.map((section) => {
              const approved = section.status === "approved";
              const notApplicable = section.status === "not_applicable";
              if (notApplicable) return null;

              return (
                <section key={section.id} aria-labelledby={section.id}>
                  <h2
                    id={section.id}
                    className="flex items-start gap-2.5 text-lg font-semibold tracking-tight text-[var(--color-ink)]"
                  >
                    {approved ? (
                      <CheckCircle2
                        size={18}
                        className="mt-1 shrink-0 text-emerald-600"
                        aria-label="Approved"
                      />
                    ) : (
                      <CircleDashed
                        size={18}
                        className="mt-1 shrink-0 text-amber-500"
                        aria-label="Awaiting approval"
                      />
                    )}
                    {section.heading}
                  </h2>

                  {approved && section.body?.length ? (
                    <div className="mt-3 space-y-3 text-sm leading-relaxed text-[var(--color-muted)]">
                      {section.body.map((paragraph) => (
                        <p key={paragraph.slice(0, 40)}>{paragraph}</p>
                      ))}
                    </div>
                  ) : (
                    <>
                      <p className="mt-3 text-sm leading-relaxed text-[var(--color-muted)]">
                        This section is awaiting approval. It will cover:
                      </p>
                      <ul className="mt-3 space-y-2">
                        {section.covers.map((item) => (
                          <li
                            key={item}
                            className="flex gap-3 text-sm leading-relaxed text-[var(--color-muted)]"
                          >
                            <span
                              aria-hidden="true"
                              className="mt-[7px] h-1 w-1 shrink-0 rounded-full bg-[var(--color-faint)]"
                            />
                            {item}
                          </li>
                        ))}
                      </ul>
                      {section.ownerAction && (
                        <details className="mt-4 rounded-xl border border-dashed border-[var(--color-line)] bg-[var(--color-canvas)] p-4">
                          <summary className="cursor-pointer text-xs font-semibold uppercase tracking-widest text-[var(--color-faint)]">
                            Owner action required
                          </summary>
                          <p className="mt-2 text-sm leading-relaxed text-[var(--color-muted)]">
                            {section.ownerAction}
                          </p>
                        </details>
                      )}
                    </>
                  )}
                </section>
              );
            })}
          </div>

          <footer className="mt-14 rounded-2xl border border-[var(--color-line)] bg-[var(--color-canvas)] p-6">
            <h2 className="text-sm font-semibold text-[var(--color-ink)]">
              Questions about this policy
            </h2>
            <p className="mt-2 text-sm leading-relaxed text-[var(--color-muted)]">
              Write to us at{" "}
              <a
                href={mailtoLink(`Question about ${policy.title} — Cosy Crest`)}
                className="font-medium text-[var(--color-ink)] underline underline-offset-2"
              >
                {CONTACT.email}
              </a>{" "}
              or call{" "}
              <a
                href={`tel:${CONTACT.phoneE164}`}
                className="font-medium text-[var(--color-ink)] underline underline-offset-2"
              >
                {CONTACT.phoneDisplay}
              </a>
              .
            </p>
            <p className="mt-3 text-xs text-[var(--color-faint)]">
              Operated by {SITE.name}.
            </p>
          </footer>
        </div>
      </main>
    </GuideShell>
  );
}
