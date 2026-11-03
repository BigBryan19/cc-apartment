// app/components/Services.tsx
// ---------------------------------------------------------------------------
// Experiences & services.
//
// Five cards, one shape: same image ratio, same type scale, same button
// position, so the row reads as a set rather than five unrelated offers. The grid
// steps 1 → 2 → 3 columns; three across leaves a balanced 3 + 2 rather than an
// orphaned fifth card under a four-column row. Prices
// come from app/lib/services.ts — the same file the booking engine's extras
// read, so a card can never advertise a figure the checkout will not charge.
//
// A card with a price can be added to a stay; an unpriced one is a WhatsApp
// enquiry. Which of the two applies, the price itself and whether the card is
// shown at all are controlled by the owner in Admin → Services, falling back to
// the approved figures in app/lib/services.ts.
// ---------------------------------------------------------------------------

"use client";

import React, { useEffect, useRef, useState } from "react";
import { ArrowRight, MessageCircle, Play } from "lucide-react";
import {
  applyServiceSettings,
  defaultServiceSettings,
  toServiceSetting,
  type ServiceSetting,
} from "../lib/service-settings";
import { createClient, isSupabaseConfigured } from "../utils/supabase";
import { useSiteTheme } from "./ThemeProvider";
import { whatsappLink } from "../lib/contact";

/**
 * A muted, looping preview that only becomes visible once the browser is
 * actually decoding frames. If autoplay is refused — low-power mode, data
 * saver, some iOS settings — `playing` stays false and the poster photograph
 * underneath simply remains. No audio, ever.
 */
function ServicePreview({ src, label }: { src: string; label: string }) {
  const ref = useRef<HTMLVideoElement | null>(null);
  const [playing, setPlaying] = useState(false);

  useEffect(() => {
    const element = ref.current;
    if (!element) return;
    const attempt = element.play();
    if (attempt && typeof attempt.catch === "function") {
      attempt.catch(() => setPlaying(false));
    }
  }, []);

  return (
    <video
      ref={ref}
      src={src}
      poster={undefined}
      muted
      loop
      playsInline
      preload="metadata"
      aria-label={label}
      onPlaying={() => setPlaying(true)}
      className={`absolute inset-0 h-full w-full object-cover transition-opacity duration-500 ${
        playing ? "opacity-100" : "opacity-0"
      }`}
    />
  );
}

interface ServicesProps {
  /** Tighter vertical rhythm when embedded on /packages. */
  compact?: boolean;
  /** Kept for callers; the rental planner was removed on 3 November 2026. */
  showRentalPlanner?: boolean;
}

const Services: React.FC<ServicesProps> = ({ compact = false }) => {
  /**
   * Settings start as the approved defaults so the section renders correctly on
   * a fresh clone or before the table exists, then take the owner's saved values
   * when they are available.
   */
  const [settings, setSettings] = useState<ServiceSetting[]>(defaultServiceSettings);

  useEffect(() => {
    if (!isSupabaseConfigured()) return;
    let cancelled = false;
    const supabase = createClient();
    supabase
      .from("service_settings")
      .select("service_id, amount, active, cta, title, description, image, image_alt")
      .then(({ data, error }) => {
        if (cancelled || error || !data?.length) return;
        const parsed = (data as Record<string, unknown>[])
          .map(toServiceSetting)
          .filter((entry): entry is ServiceSetting => entry !== null);
        if (parsed.length) setSettings(parsed);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const theme = useSiteTheme();

  /*
   * The enquiry number is set in Admin → Settings, so it is applied here too
   * rather than baked into each service's stored link.
   */
  const services = applyServiceSettings(settings).map((service) =>
    service.href.includes("wa.me/")
      ? { ...service, href: service.href.replace(/wa\.me\/\d+/, `wa.me/${theme.whatsappNumber}`) }
      : service,
  );

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
            Honeymoon setups, birthday stays, a chef in your kitchen, a car for
            your time here and a therapist who comes to you — arranged before you
            arrive, and quoted to you before anything is charged.
          </p>
        </div>

        <div className="mt-10 grid grid-cols-1 gap-6 sm:grid-cols-2 xl:grid-cols-3">
          {services.map((service) => {
            // The rental card scrolls to the planner; it needs dates, which the
            // card itself has no room for.
            const href = service.href;
            const external = service.href.startsWith("http");

            return (
              <article
                key={service.id}
                className="group flex h-full flex-col overflow-hidden rounded-2xl border border-[var(--color-line-soft)] bg-white transition-shadow duration-300 hover:shadow-[var(--shadow-card)]"
              >
                <div className="relative aspect-[4/3] overflow-hidden bg-[var(--color-canvas)]">
                  {/* The still is always painted first. A clip, when the service
                      has one, fades in over it once it is genuinely playing, so
                      a blocked autoplay leaves a photograph rather than a frozen
                      first frame. Never any audio. */}
                  <img
                    src={service.image}
                    alt={service.imageAlt}
                    loading="lazy"
                    className="h-full w-full object-cover transition-transform duration-700 ease-out group-hover:scale-105"
                  />
                  {service.video && <ServicePreview src={service.video} label={service.imageAlt} />}
                  {service.video && (
                    <span className="pointer-events-none absolute bottom-3 right-3 flex items-center gap-1 rounded-full bg-black/55 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider text-white backdrop-blur-sm">
                      <Play size={10} className="fill-white" aria-hidden="true" /> Video
                    </span>
                  )}
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
                    {service.ctaLabel}
                  </a>
                </div>
              </article>
            );
          })}
        </div>

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
