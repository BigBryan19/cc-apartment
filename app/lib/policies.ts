// app/lib/policies.ts
// ---------------------------------------------------------------------------
// Policy content scaffolding for /terms and /privacy.
//
// THESE ARE NOT LEGAL TERMS, AND THE PAGES DO NOT PRETEND THEY ARE
//
//   The brief forbids inventing legal terms, cancellation rules or refund
//   policies, and none exist in this repository. The footer previously linked
//   Terms, Privacy and Imprint to "#", which is worse than useless: it looks like
//   a policy exists while giving the guest nothing.
//
//   So each policy is modelled as a list of sections with an explicit
//   `status: "pending_approval"`, and the pages render the structure honestly —
//   what the policy will cover, and that it is awaiting owner approval. Each
//   section carries `ownerAction`, the specific decision needed, so this doubles
//   as the release checklist rather than a wall of placeholder prose.
//
//   Filling `body` for a section and setting `status: "approved"` publishes it.
//   Nothing else changes.
// ---------------------------------------------------------------------------

export type PolicySectionStatus =
  | "approved"
  | "pending_approval"
  /** The business has not decided whether to have this section at all. */
  | "not_applicable";

export interface PolicySection {
  id: string;
  heading: string;
  /** What the section must cover. Shown while pending. */
  covers: string[];
  /** Approved wording. Rendered only when `status` is "approved". */
  body?: string[];
  status: PolicySectionStatus;
  /** The decision the owner needs to make. Empty when approved. */
  ownerAction?: string;
}

export interface Policy {
  slug: "terms" | "privacy" | "imprint";
  title: string;
  summary: string;
  lastReviewed: string | null;
  sections: PolicySection[];
}

/**
 * One list drives both pages and the release checklist, so a policy cannot be
 * "approved" in one place and pending in another.
 */
export const POLICIES: Record<Policy["slug"], Policy> = {
  terms: {
    slug: "terms",
    title: "Terms & Conditions",
    summary:
      "The terms that apply when you book accommodation, an experience or an event with Cosy Crest.",
    lastReviewed: null,
    sections: [
      {
        id: "accommodation-cancellation",
        heading: "Accommodation — cancellation and refunds",
        covers: [
          "The cancellation window and what is refunded inside and outside it",
          "How a no-show is treated",
          "Whether the refundable damage deposit is returned in full and when",
          "The payment schedule: what is due at booking and when the balance falls due",
        ],
        status: "pending_approval",
        ownerAction:
          "Decide the cancellation window in days, the refund percentage inside and outside it, and whether the deposit is refundable in full.",
      },
      {
        id: "package-cancellation",
        heading: "Experiences and packages — cancellation and rescheduling",
        covers: [
          "Whether package cancellation differs from accommodation cancellation",
          "What happens to costs already committed to suppliers, such as a caterer or a decorator",
          "Whether dates can be moved, how many times, and at what notice",
          "Whether a change of date carries a fee",
        ],
        status: "pending_approval",
        ownerAction:
          "Decide whether package terms differ from accommodation terms, and what happens to non-recoverable supplier costs.",
      },
      {
        id: "rescheduling",
        heading: "Rescheduling",
        covers: [
          "The notice required to move a booking",
          "Any administration fee",
          "What happens if the new date costs more or less",
          "Whether a reschedule counts as a cancellation",
        ],
        status: "pending_approval",
        ownerAction: "Decide the notice period and whether a reschedule fee applies.",
      },
      {
        id: "occupancy",
        heading: "Occupancy, visitors and events",
        covers: [
          "That every property has an approved maximum occupancy which cannot be exceeded",
          "Whether day visitors are permitted, and whether they must be declared",
          "That booking a room does not grant permission to hold an event",
          "How an approved event differs from a gathering of visitors",
          "The consequences of exceeding the declared attendance",
        ],
        status: "pending_approval",
        ownerAction:
          "Confirm the approved maximum occupancy per property, and whether visitors are allowed at all outside an approved event.",
      },
      {
        id: "event-rules",
        heading: "Events — rules and limits",
        covers: [
          "Permitted event hours and any quiet hours",
          "Music levels, cut-off times and any sound restrictions",
          "Pool access during an event",
          "Decorations: what may be fixed to walls, and what is prohibited",
          "Outside suppliers and vendors: whether they are permitted and what approval they need",
          "Parking arrangements and any limit on vehicles",
          "Cleaning: what guests must clear, and what the property handles",
          "A refundable event damage deposit, if one applies",
          "Whether security or staff are required, and who provides them",
        ],
        status: "pending_approval",
        ownerAction:
          "Confirm each limit. These are property-specific rules the brief requires to be shown before a guest commits, and they cannot be inferred.",
      },
      {
        id: "damages",
        heading: "Damage and loss",
        covers: [
          "The refundable deposit amount and how it is held",
          "How damage is assessed and deducted",
          "The guest's liability beyond the deposit",
          "How and when a deduction is communicated",
        ],
        status: "pending_approval",
        ownerAction: "Decide the deposit amount and the assessment and deduction process.",
      },
      {
        id: "payment",
        heading: "Payment",
        covers: [
          "The currencies accepted and the currency the card is charged in",
          "Whether a displayed converted amount is an estimate",
          "When a balance falls due and the consequence of late payment",
          "Whether a deposit secures the date and for how long",
        ],
        status: "pending_approval",
        ownerAction:
          "Confirm the charge currency, whether part-payment is offered, and the balance deadline.",
      },
      {
        id: "conduct",
        heading: "Guest conduct",
        covers: [
          "Smoking",
          "Pets",
          "Noise and neighbour consideration",
          "Maximum vehicle numbers",
          "Circumstances in which a stay may be ended early",
        ],
        status: "pending_approval",
        ownerAction: "Confirm the house rules per property.",
      },
    ],
  },

  privacy: {
    slug: "privacy",
    title: "Privacy Notice",
    summary:
      "What we collect when you browse, enquire or book, why we hold it, and your rights over it.",
    lastReviewed: null,
    sections: [
      {
        id: "what-we-collect",
        heading: "What we collect",
        covers: [
          "Contact details given in a booking or enquiry: name, email, phone",
          "Booking details: dates, occupancy, occasion, special requests",
          "Payment details taken by the payment provider — and the fact that card numbers never reach our servers",
          "Technical data needed to serve the site and prevent abuse",
        ],
        status: "pending_approval",
        ownerAction: "Confirm the list is complete and accurate for how the business actually operates.",
      },
      {
        id: "why",
        heading: "Why we hold it",
        covers: [
          "To hold your dates and fulfil your booking",
          "To prepare and send a quote for an experience or event",
          "To take payment and issue receipts",
          "To contact you about your booking",
          "To meet accounting and legal obligations",
        ],
        status: "pending_approval",
        ownerAction: "Confirm the lawful basis relied on for each purpose, particularly for marketing.",
      },
      {
        id: "sharing",
        heading: "Who we share it with",
        covers: [
          "The payment provider (Paystack) as the processor for your transaction",
          "The email provider (Resend) for transactional messages",
          "Supabase as the database and authentication host",
          "Any vendor or supplier involved in fulfilling your event, and exactly what they are told",
        ],
        status: "pending_approval",
        ownerAction:
          "Confirm the processor list and the retention periods each provider applies. A processor not listed here is a compliance gap.",
      },
      {
        id: "retention",
        heading: "How long we keep it",
        covers: [
          "The retention period for booking and enquiry records",
          "The retention period for payment records, which may be set by law",
          "How a deletion request is handled against outstanding bookings",
        ],
        status: "pending_approval",
        ownerAction: "Decide retention periods, and confirm what Ghana's data protection requirements oblige.",
      },
      {
        id: "marketing",
        heading: "Marketing messages",
        covers: [
          "Whether marketing messages are sent at all",
          "That consent is asked for separately and can be withdrawn",
          "That booking and enquiry messages are not marketing",
        ],
        status: "pending_approval",
        ownerAction:
          "Confirm whether marketing is sent. If it is not, say so explicitly — it is the strongest position.",
      },
      {
        id: "rights",
        heading: "Your rights",
        covers: [
          "Requesting a copy of what we hold",
          "Correcting inaccurate details",
          "Requesting deletion, and the limits imposed by records we must keep",
          "Objecting to processing",
          "How to complain, and to whom",
        ],
        status: "pending_approval",
        ownerAction: "Nominate the contact who handles data requests, and the supervisory authority to name.",
      },
      {
        id: "cookies",
        heading: "Cookies and local storage",
        covers: [
          "Authentication cookies, which are strictly necessary for the admin area",
          "Local storage used to remember your selected currency",
          "Local storage used to keep a booking draft while you move between pages",
          "Whether analytics or advertising cookies are used at all",
        ],
        status: "pending_approval",
        ownerAction:
          "Confirm whether analytics is enabled. The site currently ships no third-party analytics, so if none is added this section can state that plainly.",
      },
    ],
  },

  imprint: {
    slug: "imprint",
    title: "Imprint",
    summary: "Who operates Cosy Crest, and how to reach us.",
    lastReviewed: null,
    sections: [
      {
        id: "operator",
        heading: "Operating entity",
        covers: ["The registered business name", "The registered address", "Any registration or licence number"],
        status: "pending_approval",
        ownerAction: "Supply the registered entity name, address and any registration number.",
      },
      {
        id: "contact",
        heading: "Contact",
        covers: ["Telephone", "Email address", "A postal address for formal correspondence"],
        status: "pending_approval",
        ownerAction:
          "Confirm the contact details are the right ones for formal correspondence, not just WhatsApp.",
      },
    ],
  },
};

export function policyCompleteness(policy: Policy): {
  approved: number;
  total: number;
  ready: boolean;
} {
  const approved = policy.sections.filter((section) => section.status === "approved").length;
  return {
    approved,
    total: policy.sections.length,
    ready: approved === policy.sections.length,
  };
}
