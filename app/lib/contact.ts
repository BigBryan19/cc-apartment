// app/lib/contact.ts
// ---------------------------------------------------------------------------
// One source for the business's contact details.
//
// These were duplicated across app/lib/seo.ts, app/lib/receipt.ts and
// app/receipt/[reference]/page.tsx, so changing a number risked the receipt, the
// structured data and the contact page disagreeing. Everything imports from here.
//
// Nothing in this file is invented: each value already appeared in the codebase.
// ---------------------------------------------------------------------------

export const CONTACT = {
  phoneDisplay: "+233 54 053 4870",
  phoneE164: "+233540534870",
  /** wa.me needs the number without punctuation or a leading plus. */
  whatsappNumber: "2330540534870",
  email: "officialcosycrestaparts@gmail.com",
  /** Responses are handled by a person, not a queue. */
  responseNote:
    "We answer messages ourselves. For a booking enquiry we aim to reply within a few hours during the day.",
} as const;

/**
 * A WhatsApp deep link.
 *
 * `prefill` carries a booking or enquiry reference so a customer-initiated
 * message arrives with the context attached. Nothing is ever sent automatically:
 * this only builds a URL the guest chooses to open.
 */
export function whatsappLink(prefill?: string): string {
  const base = `https://wa.me/${CONTACT.whatsappNumber}`;
  if (!prefill?.trim()) return base;
  return `${base}?text=${encodeURIComponent(prefill.trim())}`;
}

export function mailtoLink(subject: string, body?: string): string {
  const params = new URLSearchParams({ subject });
  if (body?.trim()) params.set("body", body);
  return `mailto:${CONTACT.email}?${params.toString()}`;
}

export function telLink(): string {
  return `tel:${CONTACT.phoneE164}`;
}

/** Structured opening hours for JSON-LD. Not configured, so not claimed. */
export const BUSINESS_HOURS_CONFIGURED = false;
