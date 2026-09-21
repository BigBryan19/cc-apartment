// app/lib/content.ts
// ---------------------------------------------------------------------------
// Copy that appears in more than one place.
//
// The FAQ lives here rather than inside FAQ.tsx because app/lib/seo.ts turns
// the same array into FAQPage structured data. Keeping one copy means the
// markup a visitor reads and the markup a crawler reads can never disagree —
// which is exactly what Google penalises when it detects the mismatch.
// ---------------------------------------------------------------------------

export interface Faq {
  question: string;
  answer: string;
}

export const FAQS: Faq[] = [
  {
    question: "What are the check-in and check-out times?",
    answer:
      "Standard check-in is at 2:00 PM, and check-out is at 11:00 AM. Early check-in or late check-out can be arranged upon request, subject to availability.",
  },
  {
    question: "Are pets allowed in the apartments?",
    answer:
      "Yes, select properties like our Aburi Mountain Retreat are pet-friendly. Please let us know during booking so we can prepare accordingly.",
  },
  {
    question: "Is security guaranteed at the properties?",
    answer:
      "Absolutely. All properties are equipped with 24/7 security personnel, CCTV surveillance and secure parking to ensure maximum safety.",
  },
  {
    question: "How do the special packages (birthday / honeymoon) work?",
    answer:
      "Once you select a package during checkout or via WhatsApp, our concierge team will reach out to discuss your exact preferences and themes, and arrange everything before your arrival.",
  },
  {
    question: "Can I cancel or modify my reservation?",
    answer:
      "Yes, reservations can be modified or cancelled up to 48 hours before check-in for a full refund. Please review our full terms and conditions for extended stays.",
  },
];
