// app/components/Navbar.tsx
"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { Menu, X, Globe, Check } from "lucide-react";

interface NavbarProps {
  currency: "GHS" | "USD";
  toggleCurrency: () => void;
  /**
   * "overlay" (default) floats transparently over a dark hero.
   * "solid" is always the light surface — required on any page without a dark
   * hero behind it, otherwise the white text would be invisible.
   */
  variant?: "overlay" | "solid";
}

const LINKS = [
  { label: "Villas", href: "#villas" },
  { label: "About Us", href: "#aboutus" },
  { label: "Contact", href: "#contact" },
];

const Navbar: React.FC<NavbarProps> = ({
  currency,
  toggleCurrency,
  variant = "overlay",
}) => {
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setIsScrolled(window.scrollY > 24);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // Lock body scroll while the mobile drawer is open.
  useEffect(() => {
    document.body.style.overflow = isMobileMenuOpen ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [isMobileMenuOpen]);

  const goToVillas = () => {
    setIsMobileMenuOpen(false);
    document.getElementById("villas")?.scrollIntoView({ behavior: "smooth" });
  };

  // On the hero the bar is transparent with light text; once scrolled — or on
  // a page with no dark hero behind it — it becomes a light surface.
  const isLight = variant === "solid" || isScrolled;

  return (
    <>
      <header
        className={`fixed top-0 inset-x-0 z-50 transition-all duration-300 ${
          isLight
            ? // Fully opaque rather than /95: at 95% the collage ghosted faintly
              // through as it scrolled under the bar, which reads as the same
              // "image on top of the navbar" problem even once the stacking
              // order is correct.
              "bg-white border-b border-[var(--color-line-soft)]"
            : "bg-gradient-to-b from-black/45 to-transparent"
        }`}
      >
        <nav
          className={`shell flex items-center justify-between transition-all duration-300 ${
            isLight ? "h-16 md:h-20" : "h-20 md:h-24"
          }`}
        >
          {/* Wordmark */}
          <Link
            href="/"
            className="flex items-center shrink-0"
            aria-label="Cosy Crest home"
          >
            {/* The brand asset is a pure-white wordmark, so it needs a filter
                on either background: black on light surfaces, white on dark. */}
            <img
              src="/cc-horinzontal.png"
              alt="Cosy Crest"
              className={`w-auto transition-all duration-300 ${
                isLight ? "h-7 md:h-8" : "h-8 md:h-10"
              } ${isLight ? "brightness-0" : "brightness-0 invert"}`}
            />
          </Link>

          {/* Desktop links */}
          <div className="hidden md:flex items-center gap-1">
            {LINKS.map((link) => (
              <a
                key={link.href}
                href={link.href}
                className={`px-4 py-2 text-sm font-medium rounded-full transition-colors ${
                  isLight
                    ? "text-[var(--color-ink-soft)] hover:bg-[var(--color-canvas)] hover:text-[var(--color-ink)]"
                    : "text-white/90 hover:bg-white/10 hover:text-white"
                }`}
              >
                {link.label}
              </a>
            ))}
          </div>

          {/* Desktop actions */}
          <div className="hidden md:flex items-center gap-2">
            <button
              onClick={toggleCurrency}
              className={`flex items-center gap-1.5 px-3.5 py-2 text-sm font-medium rounded-full border transition-colors ${
                isLight
                  ? "border-[var(--color-line)] text-[var(--color-ink-soft)] hover:bg-[var(--color-canvas)]"
                  : "border-white/30 text-white hover:bg-white/10"
              }`}
              aria-label={`Currency: ${currency}. Switch currency.`}
            >
              <Globe size={15} />
              {currency}
            </button>

            <button
              onClick={goToVillas}
              className="btn-accent px-5 py-2.5 rounded-full text-sm"
            >
              Book Now
            </button>
          </div>

          {/* Mobile trigger */}
          <button
            className={`md:hidden p-2 -mr-2 rounded-full transition-colors ${
              isLight ? "text-[var(--color-ink)]" : "text-white"
            }`}
            onClick={() => setIsMobileMenuOpen(true)}
            aria-label="Open menu"
          >
            <Menu size={26} />
          </button>
        </nav>
      </header>

      {/* ---------------- Mobile drawer ---------------- */}
      <div
        className={`fixed inset-0 z-[60] md:hidden transition-opacity duration-300 ${
          isMobileMenuOpen
            ? "opacity-100 pointer-events-auto"
            : "opacity-0 pointer-events-none"
        }`}
        aria-hidden={!isMobileMenuOpen}
      >
        <div
          className="absolute inset-0 bg-black/40"
          onClick={() => setIsMobileMenuOpen(false)}
        />

        <div
          className={`absolute top-0 right-0 h-full w-[84%] max-w-sm bg-white shadow-2xl flex flex-col transition-transform duration-300 ease-out ${
            isMobileMenuOpen ? "translate-x-0" : "translate-x-full"
          }`}
        >
          <div className="flex items-center justify-between h-16 px-5 border-b border-[var(--color-line-soft)]">
            <img
              src="/cc-horinzontal.png"
              alt="Cosy Crest"
              className="h-7 w-auto brightness-0"
            />
            <button
              onClick={() => setIsMobileMenuOpen(false)}
              className="p-2 -mr-2 text-[var(--color-ink)] hover:bg-[var(--color-canvas)] rounded-full transition-colors"
              aria-label="Close menu"
            >
              <X size={22} />
            </button>
          </div>

          <nav className="flex-1 overflow-y-auto py-4">
            {LINKS.map((link) => (
              <a
                key={link.href}
                href={link.href}
                onClick={() => setIsMobileMenuOpen(false)}
                className="block px-5 py-3.5 text-lg font-medium text-[var(--color-ink)] hover:bg-[var(--color-canvas)] transition-colors"
              >
                {link.label}
              </a>
            ))}
          </nav>

          <div className="p-5 border-t border-[var(--color-line-soft)] space-y-4">
            <div>
              <span className="eyebrow block mb-2">Currency</span>
              <div className="flex gap-2">
                {(["GHS", "USD"] as const).map((c) => (
                  <button
                    key={c}
                    onClick={() => {
                      if (currency !== c) toggleCurrency();
                    }}
                    className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-lg border text-sm font-semibold transition-colors ${
                      currency === c
                        ? "border-[var(--color-ink)] bg-[var(--color-ink)] text-white"
                        : "border-[var(--color-line)] text-[var(--color-ink-soft)]"
                    }`}
                  >
                    {currency === c && <Check size={14} />}
                    {c}
                  </button>
                ))}
              </div>
            </div>

            <button
              onClick={goToVillas}
              className="btn-accent w-full py-3.5 rounded-xl text-sm"
            >
              Book Now
            </button>
          </div>
        </div>
      </div>
    </>
  );
};

export default Navbar;
