// app/lib/theme.ts
// ---------------------------------------------------------------------------
// Brand appearance, owned by the site owner.
//
// Stored as one row in `site_settings` under the key `theme`, so a colour or a
// word can change without a deploy. The values are read on the server in
// app/layout.tsx and written out as CSS variables, which means the very first
// paint already uses them — no flash of the old palette.
//
// Only what is genuinely global lives here. A service card's own colour and copy
// belong to that service, in Admin → Services.
// ---------------------------------------------------------------------------

export interface ThemeSettings {
  /** Shown in the header, footer and page titles. */
  brandName: string;
  /** Button, link and highlight colour. */
  accentColor: string;
  /** Hover/pressed shade. */
  accentDeep: string;
  /** Tinted surfaces (badges, soft panels). */
  accentSoft: string;
  /** The main booking button on a property page. */
  primaryCtaLabel: string;
  /** The enquiry button, used where a rate cannot be booked online. */
  enquiryCtaLabel: string;
  /** Digits only, international format, e.g. 233540534870. */
  whatsappNumber: string;
  /** One-line promise under the hero heading. */
  heroSubhead: string;
}

export const DEFAULT_THEME: ThemeSettings = {
  brandName: "Cosy Crest",
  accentColor: "#455360",
  accentDeep: "#37424d",
  accentSoft: "#eef1f4",
  primaryCtaLabel: "Reserve now",
  enquiryCtaLabel: "Enquire on WhatsApp",
  whatsappNumber: "233540534870",
  heroSubhead: "",
};

const HEX = /^#[0-9a-fA-F]{3,8}$/;

function pickColor(value: unknown, fallback: string): string {
  return typeof value === "string" && HEX.test(value.trim()) ? value.trim() : fallback;
}

function pickText(value: unknown, fallback: string, max = 80): string {
  if (typeof value !== "string") return fallback;
  const text = value.trim();
  return text ? text.slice(0, max) : fallback;
}

/** A stored row, merged over the defaults. Anything unusable keeps the default. */
export function toTheme(row: unknown): ThemeSettings {
  const raw = (row ?? {}) as Record<string, unknown>;
  return {
    brandName: pickText(raw.brandName ?? raw.brand_name, DEFAULT_THEME.brandName, 40),
    accentColor: pickColor(raw.accentColor ?? raw.accent_color, DEFAULT_THEME.accentColor),
    accentDeep: pickColor(raw.accentDeep ?? raw.accent_deep, DEFAULT_THEME.accentDeep),
    accentSoft: pickColor(raw.accentSoft ?? raw.accent_soft, DEFAULT_THEME.accentSoft),
    primaryCtaLabel: pickText(
      raw.primaryCtaLabel ?? raw.primary_cta_label,
      DEFAULT_THEME.primaryCtaLabel,
      24,
    ),
    enquiryCtaLabel: pickText(
      raw.enquiryCtaLabel ?? raw.enquiry_cta_label,
      DEFAULT_THEME.enquiryCtaLabel,
      28,
    ),
    whatsappNumber: (() => {
      const digits = String(raw.whatsappNumber ?? raw.whatsapp_number ?? "").replace(/\D/g, "");
      return digits.length >= 8 ? digits : DEFAULT_THEME.whatsappNumber;
    })(),
    heroSubhead: pickText(raw.heroSubhead ?? raw.hero_subhead, DEFAULT_THEME.heroSubhead, 160),
  };
}

/**
 * The CSS the layout renders into <head>.
 *
 * `--color-accent-soft` is derived from the accent when the owner leaves it
 * alone, so choosing one colour does not leave the pale surfaces on the old
 * palette.
 */
export function themeCss(theme: ThemeSettings): string {
  const soft =
    theme.accentSoft === DEFAULT_THEME.accentSoft
      ? `color-mix(in srgb, ${theme.accentColor} 12%, white)`
      : theme.accentSoft;

  return `:root{--color-accent:${theme.accentColor};--color-accent-deep:${theme.accentDeep};--color-accent-soft:${soft};}`;
}
