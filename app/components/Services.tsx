// app/components/Services.tsx
// ---------------------------------------------------------------------------
// Experiences & services.
//
// Four cards, one shape: same image ratio, same type scale, same button
// position, so the row reads as a set rather than four unrelated offers. Prices
// come from app/lib/services.ts — the same file the booking engine's extras
// read, so a card can never advertise a figure the checkout will not charge.
//
// Every card's action is a WhatsApp enquiry prefilled with the service name.
// Nothing here takes a payment: these are arrangements that a person confirms.
// ---------------------------------------------------------------------------

"use client";

import React from "react";
import { ArrowRight, MessageCircle } from "lucide-react";
import { SERVICES } from "../lib/services";
import { whatsappLink } from "../lib/contact";
import CarRentalCalculator from "./services/CarRentalCalculator";

interface ServicesProps {
  /** Tighter vertical rhythm when embedded on /packages. */
  compact?: boolean;
  /** Show the rental planner under the cards. */
  showRentalPlanner?: boolean;
}

const Services: React.FC<ServicesProps> = ({
  compact = false,
  showRentalPlanner = true,
}) => {
  return (
    <section
      id="services"
      className={`bg-[var(--color-canvas)] ${compact ? "py-14 md:py-16" : "section-y"}`}
    >
      <div className="shell">
        <div className="max-w-2xl">
          <span className="eyebrow">Experiences &amp; services</span>
          <h2 className="mt-2 text-3xl font-semibold tracking-tight text-[var(--color-ink)] sm:text-4xl">
            Make the stay an occasion
          </h2>
          <p className="mt-3 text-sm leading-relaxed text-[var(--color-muted)]">
            Honeymoon setups, birthday stays, a car for your time here and a
            therapist who comes to you — arranged before you arrive and billed
            with your stay.
          </p>
        </div>

        <div className="mt-10 grid grid-cols-1 gap-6 sm:grid-cols-2 xl:grid-cols-4">
          {SERVICES.map((service) => {
            // The rental card scrolls to the planner; it needs dates, which the
            // card itself has no room for.
            const isRental = service.id === "car-rental";
            const href = isRental && showRentalPlanner ? "#car-rental-planner" : service.href;
            const external = !(isRental && showRentalPlanner);

            return (
              <article
                key={service.id}
                className="group flex h-full flex-col overflow-hidden rounded-2xl border border-[var(--color-line-soft)] bg-white transition-shadow duration-300 hover:shadow-[var(--shadow-card)]"
              >
                <div className="relative aspect-[4/3] overflow-hidden bg-[var(--color-canvas)]">
                  <img
                    src={service.image}
                    alt={service.imageAlt}
                    loading="lazy"
                    className="h-full w-full object-cover transition-transform duration-700 ease-out group-hover:scale-105"
                  />
                </div>

                <div className="flex flex-1 flex-col p-6">
                  <h3 className="text-lg font-semibold tracking-tight text-[var(--color-ink)]">
                    {service.name}
                  </h3>
                  <p className="mt-0.5 text-[11px] font-semibold uppercase tracking-[0.12em] text-[var(--color-faint)]">
                    {service.tagline}
                  </p>
                  <p className="mt-3 text-sm leading-relaxed text-[var(--color-muted)]">
                    {service.description}
                  </p>

                  {/* Price block sits at a fixed position so all four align. */}
                  <div className="mt-5 border-t border-[var(--color-line-soft)] pt-4">
                    <p className="text-base font-semibold tracking-tight text-[var(--color-ink)]">
                      {service.priceLabel}
                    </p>
                    <p className="mt-1 text-[11px] leading-relaxed text-[var(--color-faint)]">
                      {service.priceNote}
                    </p>
                  </div>

                  <a
                    href={href}
                    {...(external
                      ? { target: "_blank", rel: "noopener noreferrer" }
                      : {})}
                    className="mt-5 flex w-full items-center justify-center gap-2 rounded-lg border border-[var(--color-line)] py-3 text-sm font-semibold text-[var(--color-ink)] transition-colors hover:border-[var(--color-ink)] hover:bg-[var(--color-canvas)]"
                  >
                    {external ? (
                      <MessageCircle size={15} aria-hidden="true" />
                    ) : (
                      <ArrowRight size={15} aria-hidden="true" />
                    )}
                    {isRental && showRentalPlanner ? "Check dates" : service.ctaLabel}
                  </a>
                </div>
              </article>
            );
          })}
        </div>

        {showRentalPlanner && <CarRentalCalculator />}

        <div className="mt-10 flex flex-col items-start justify-between gap-5 rounded-2xl bg-[var(--color-ink)] px-7 py-8 sm:flex-row sm:items-center md:px-10">
          <div>
            <h3 className="text-lg font-semibold tracking-tight text-white">
              Need something else arranged?
            </h3>
            <p className="mt-1 max-w-xl text-sm leading-relaxed text-white/65">
              Airport transfers, private chefs, decorations, extended stays — tell
              us what you have in mind and we will arrange it.
            </p>
          </div>
          <a
            href={whatsappLink(
              "Hello Cosy Crest — I'd like help arranging something for my stay.",
            )}
            target="_blank"
            rel="noopener noreferrer"
            className="btn-accent shrink-0 rounded-full px-7 py-3 text-sm"
          >
            Contact concierge
          </a>
        </div>
      </div>
    </section>
  );
};

export default Services;
