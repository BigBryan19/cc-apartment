// app/lib/service-settings.ts
// ---------------------------------------------------------------------------
// Owner-controlled settings for the Experiences & services cards.
//
// WHAT THE OWNER CAN CHANGE
//
//   • Whether a card appears at all.
//   • Its price. A priced service is booked; an unpriced one is an enquiry.
//   • Whether the button books (adds the service to a stay) or opens WhatsApp.
//
// WHY A TABLE AND NOT JUST CODE
//
//   The cards used to hard-code their prices in app/lib/services.ts, so changing
//   one meant a deploy. The price the card shows must still be the price the
//   booking engine charges, so the override lives in `service_settings` and both
//   the card and the add-on lookup read it. When no row exists the approved
//   figures in services.ts apply — the table adds control, it does not become a
//   second source of truth by accident.
// ---------------------------------------------------------------------------

import { SERVICES, type ServiceDefinition } from "./services";

export type ServiceCta = "book" | "enquire";

export interface ServiceSetting {
  serviceId: string;
  /** Major units, GHS. Null means the service is unpriced. */
  amount: number | null;
  active: boolean;
  cta: ServiceCta;
  /** Card copy and photograph. Null keeps the approved wording in services.ts. */
  title: string | null;
  description: string | null;
  image: string | null;
  imageAlt: string | null;
}

/** What applies before the owner has saved anything. */
export function defaultServiceSettings(): ServiceSetting[] {
  return SERVICES.map((service) => ({
    serviceId: service.id,
    amount: service.price?.amount ?? null,
    active: true,
    // A priced service can be added to a stay; an unpriced one cannot.
    cta: service.price === null ? "enquire" : "book",
    title: null,
    description: null,
    image: null,
    imageAlt: null,
  }));
}

export function toServiceSetting(row: Record<string, unknown>): ServiceSetting | null {
  const serviceId = typeof row.service_id === "string" ? row.service_id : "";
  if (!serviceId) return null;
  const amount =
    typeof row.amount === "number" && Number.isFinite(row.amount) && row.amount > 0
      ? row.amount
      : null;
  const text = (value: unknown) =>
    typeof value === "string" && value.trim() ? value.trim() : null;

  return {
    serviceId,
    amount,
    active: row.active !== false,
    cta: row.cta === "book" ? "book" : "enquire",
    title: text(row.title),
    description: text(row.description),
    image: text(row.image),
    imageAlt: text(row.image_alt),
  };
}

export function formatServiceAmount(amount: number): string {
  return `From GHS ${amount.toLocaleString("en-GH")}`;
}

/**
 * Apply saved settings to the catalogue.
 *
 * Anything not overridden keeps its code-defined price and action, so a missing
 * row never blanks a card.
 */
export function applyServiceSettings(settings: ServiceSetting[]): ServiceDefinition[] {
  const byId = new Map(settings.map((setting) => [setting.serviceId, setting]));

  return SERVICES.filter((service) => {
    const setting = byId.get(service.id);
    return setting ? setting.active : true;
  }).map((service) => {
    const setting = byId.get(service.id);
    if (!setting) return service;

    const amount = setting.amount;
    const priced = amount !== null;
    const basis = service.price?.basis ?? "per_stay";

    return {
      ...service,
      // Copy and photograph: the saved value wins, otherwise the approved text.
      name: setting.title ?? service.name,
      description: setting.description ?? service.description,
      image: setting.image ?? service.image,
      imageAlt: setting.imageAlt ?? service.imageAlt,
      price: priced ? { amount, basis, from: service.price?.from ?? true } : null,
      priceLabel: priced
        ? `${formatServiceAmount(amount)} ${basis === "per_day" ? "per day" : "per stay"}`
        : "Enquire for pricing",
      ctaLabel: priced && setting.cta === "book" ? "Add to your stay" : "Enquire on WhatsApp",
      // A bookable service sends the guest to the stays, where it is attached to
      // a specific booking; an unpriced one keeps its prefilled WhatsApp enquiry.
      href: priced && setting.cta === "book" ? "/#villas" : service.href,
      ...(priced && setting.cta === "book"
        ? {
            priceNote:
              "Charged with your stay once dates are chosen — added on the property page or at checkout.",
          }
        : {}),
    };
  });
}
