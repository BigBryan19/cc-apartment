"use client";

// ---------------------------------------------------------------------------
// Footer.
//
// The contact block itself lives in ContactSection, which the property pages
// and the guides also render inline. Those pages pass `showContact={false}` so
// the page shows one enquiry form rather than two — theirs carries the
// `id="contact"` anchor instead.
// ---------------------------------------------------------------------------

import React from "react";
import Link from "next/link";
import { Facebook, Instagram, Twitter } from "lucide-react";
import ContactSection from "./ContactSection";

const LEGAL_LINKS = [
  { label: "Terms & Conditions", href: "/terms" },
  { label: "Privacy Notice", href: "/privacy" },
  { label: "Imprint", href: "/imprint" },
] as const;

interface FooterProps {
  /** Set false when the page already renders a ContactSection inline. */
  showContact?: boolean;
}

const Footer: React.FC<FooterProps> = ({ showContact = true }) => {
  return (
    <footer className="bg-[var(--color-canvas-warm)] pt-16 md:pt-20">
      <div className="shell">
        {showContact && (
          <ContactSection id="contact" heading="Let's plan your stay" />
        )}

        {/* ---------------- Bottom bar ---------------- */}
        <div
          className={`grid gap-8 border-t border-[var(--color-line)] py-10 text-xs text-[var(--color-muted)] md:grid-cols-3 md:gap-12 ${
            showContact ? "mt-14" : ""
          }`}
        >
          <div>
            {/* White wordmark, darkened for the light footer background. */}
            <img
              src="/cc-horinzontal.png"
              alt="Cosy Crest"
              className="mb-4 h-8 w-auto brightness-0"
            />
            <p className="max-w-xs leading-relaxed">
              Fully serviced apartments in Accra and Aburi, delivered with
              hotel-grade housekeeping and 24/7 support.
            </p>
          </div>

          {/* Real destinations. These three used to be `href="#"`, which looked
              like a policy existed while giving the guest nothing. */}
          <nav
            aria-label="Legal and policies"
            className="flex flex-col gap-3 font-medium md:items-center md:justify-center"
          >
            {LEGAL_LINKS.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="rounded transition-colors hover:text-[var(--color-ink)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-ink)]"
              >
                {item.label}
              </Link>
            ))}
          </nav>

          <div className="md:text-right">
            <p className="font-semibold uppercase tracking-wide text-[var(--color-ink)]">
              Connect with us
            </p>
            <div className="mt-3 flex gap-4 text-[var(--color-ink)] md:justify-end">
              {[Facebook, Instagram, Twitter].map((Icon, i) => (
                <Icon
                  key={i}
                  size={16}
                  className="cursor-pointer transition-colors hover:text-[var(--color-muted)]"
                />
              ))}
            </div>
            <p className="mt-4 text-[11px] text-[var(--color-faint)]">
              © {new Date().getFullYear()} Cosy Crest Apartments. All rights
              reserved.
            </p>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
