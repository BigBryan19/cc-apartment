// app/lib/packages.ts
// ---------------------------------------------------------------------------
// The occasion products: honeymoon, birthday and private gatherings.
//
// ALL THREE START AS DRAFTS, AND THAT IS DELIBERATE
//
//   Nothing in this repository or the production database says what a Cosy Crest
//   honeymoon package includes, what it costs, how many guests it takes, how
//   much notice it needs, or what the cancellation terms are. Inventing any of
//   that would put a commitment in front of a customer that the business has not
//   made.
//
//   So every package ships as `status: "draft"` in `mode: "quotation"`, with
//   `amount: null` and empty inclusions. The customer-facing pages present them
//   honestly — what the experience is, what we will ask, and "Request a quote" —
//   and the admin screen collects the missing settings. `canPublish()` is the
//   gate: it refuses to publish an instantly bookable package until the price,
//   eligibility, availability and policy fields are all present. Until then a
//   guest can only enquire, and an enquiry never produces a confirmation.
//
//   `requiredQuestions` is different: those are form fields, specified by the
//   brief, and are safe to define because they collect information rather than
//   promise anything.
// ---------------------------------------------------------------------------

import type { PriceBasis } from "./rates";

export type PackageCategory = "honeymoon" | "birthday" | "private_gathering";

/**
 * Birthday is two products, not one. Decorating a room and hosting a party have
 * different requirements, different eligibility and different risks — treating
 * them as one flow is what produced "birthday" bookings that collected no
 * attendance figure for an event that had guests.
 */
export type PackageVariant = "room_setup" | "hosted_event" | "overnight" | "day_event";

/** How the package can be bought. */
export type PackageMode =
  /** Approved price exists; instant booking once inventory and capacity confirm. */
  | "fixed_price"
  /** Always a human quote. Enquiry only. */
  | "quotation";

export type PackageStatus = "draft" | "published" | "archived";

export type QuestionType = "text" | "textarea" | "number" | "date" | "time" | "select" | "boolean";

export interface PackageQuestion {
  id: string;
  label: string;
  type: QuestionType;
  required: boolean;
  helpText?: string;
  options?: string[];
  /** Shown on the admin quote, not to the guest. */
  internal?: boolean;
}

export interface PackageExtra {
  id: string;
  name: string;
  /** Major units, or null when the extra is not yet approved for sale. */
  amount: number | null;
  priceBasis: PriceBasis;
  maxQuantity?: number;
  /** Excluded from instant booking until priced. */
  requiresQuote: boolean;
  description?: string;
}

export interface PackageEligibility {
  /** Properties the package may be sold on. Empty means none configured. */
  propertyIds: number[];
  /** Unit ids within those properties. Empty means any eligible unit. */
  unitIds: string[];
  /** Set when the package must be booked with accommodation. */
  accommodationIncluded: boolean;
  /** Set when the package may be added to a stay booked separately. */
  canAttachToStay: boolean;
}

export interface PackageDefinition {
  slug: string;
  category: PackageCategory;
  variant: PackageVariant | null;
  name: string;
  /** One line, shown on cards. */
  summary: string;
  /** Longer introduction on the detail page. */
  introduction: string;

  whoItsFor: string[];

  /** Empty until an owner supplies them. Never generated. */
  inclusions: string[];
  exclusions: string[];

  eligibility: PackageEligibility | null;

  priceBasis: PriceBasis;
  /** Minor-safe major units. Null means not approved. */
  amount: number | null;
  /** How the price is described, e.g. "from, per night". */
  priceNote: string | null;

  capacity: {
    /** Null means not configured. */
    minGuests: number | null;
    maxGuests: number | null;
  };

  /** Days of notice required. Null means not configured. */
  minimumNoticeDays: number | null;
  leadTimeNote: string | null;

  extras: PackageExtra[];

  /** References an owner-authored policy. Null means none approved yet. */
  cancellationPolicyId: string | null;
  /** Owner-authored facility rules for events. */
  facilityRules: string[];

  requiredQuestions: PackageQuestion[];
  faqs: { question: string; answer: string }[];

  mode: PackageMode;
  status: PackageStatus;

  /** Human-readable list of what is still missing. Shown in admin. */
  pendingSettings: string[];
}

// ---------------------------------------------------------------------------
// Shared question sets
// ---------------------------------------------------------------------------

const STAY_QUESTIONS: PackageQuestion[] = [
  { id: "checkIn", label: "Check-in date", type: "date", required: true },
  { id: "checkOut", label: "Check-out date", type: "date", required: true },
  { id: "guests", label: "Number of guests staying overnight", type: "number", required: true },
  { id: "setupTiming", label: "Preferred setup time", type: "time", required: false, helpText: "When should the room be ready before you arrive?" },
  { id: "specialRequests", label: "Special requests", type: "textarea", required: false },
];

const NOT_CONFIGURED = [
  "Approved package price and pricing basis",
  "Inclusions and exclusions",
  "Eligible properties and accommodation types",
  "Maximum capacity",
  "Minimum notice period",
  "Cancellation and rescheduling terms",
];

// ---------------------------------------------------------------------------
// Catalogue
// ---------------------------------------------------------------------------

export const PACKAGES: PackageDefinition[] = [
  {
    slug: "honeymoon",
    category: "honeymoon",
    variant: "overnight",
    name: "Honeymoon & Romantic Getaway",
    summary: "A private, quietly staged stay for two.",
    introduction:
      "A stay designed around privacy and a considered arrival. Tell us your dates and what would make the trip feel like yours, and we will confirm what we can stage, when we need access, and what it costs.",
    whoItsFor: [
      "Couples celebrating a honeymoon, anniversary or engagement",
      "Guests who want the room prepared before they arrive",
      "Couples who would rather agree the details in advance than improvise on the day",
    ],
    inclusions: [],
    exclusions: [],
    eligibility: null,
    priceBasis: "per_stay",
    amount: null,
    priceNote: null,
    capacity: { minGuests: 2, maxGuests: null },
    minimumNoticeDays: null,
    leadTimeNote: null,
    extras: [],
    cancellationPolicyId: null,
    facilityRules: [],
    requiredQuestions: [
      ...STAY_QUESTIONS,
      {
        id: "setupStyle",
        label: "Preferred setup style",
        type: "select",
        required: false,
        options: ["Let us suggest", "Understated", "Full celebration"],
      },
      { id: "arrivalTime", label: "Expected arrival time", type: "time", required: false },
      {
        id: "occasionDate",
        label: "Is there a specific date being celebrated?",
        type: "date",
        required: false,
        helpText: "For example a wedding date or an anniversary. Helps us time the setup.",
      },
    ],
    faqs: [
      {
        question: "Can the setup be a surprise?",
        answer:
          "Tell us in the enquiry and we will arrange the timing with you directly. We confirm this per booking rather than promising it as standard.",
      },
      {
        question: "Is the pool private?",
        answer:
          "It depends on the accommodation you choose. Each unit states whether the pool and other areas are exclusive to you or shared, and we will confirm it on your quote.",
      },
    ],
    mode: "quotation",
    status: "draft",
    pendingSettings: NOT_CONFIGURED,
  },
  {
    slug: "birthday-room-setup",
    category: "birthday",
    variant: "room_setup",
    name: "Birthday Room Setup & Staycation",
    summary: "An overnight stay with the room prepared for a birthday.",
    introduction:
      "An overnight booking for your own party, with the room staged before you arrive. No additional event guests — for that, see Birthday Celebrations.",
    whoItsFor: [
      "Guests marking a birthday with an overnight stay",
      "Small groups staying the night rather than hosting visitors",
      "Anyone who wants the room ready on arrival",
    ],
    inclusions: [],
    exclusions: [],
    eligibility: null,
    priceBasis: "per_stay",
    amount: null,
    priceNote: null,
    capacity: { minGuests: 1, maxGuests: null },
    minimumNoticeDays: null,
    leadTimeNote: null,
    extras: [],
    cancellationPolicyId: null,
    facilityRules: [],
    requiredQuestions: [
      ...STAY_QUESTIONS,
      {
        id: "setupDate",
        label: "Setup date",
        type: "date",
        required: false,
        helpText: "Defaults to your check-in date.",
      },
      {
        id: "theme",
        label: "Theme or colour scheme",
        type: "text",
        required: false,
        helpText: "Leave blank and we will suggest something.",
      },
      { id: "ageOrMilestone", label: "Age or milestone", type: "text", required: false },
    ],
    faqs: [
      {
        question: "Can I bring additional guests who are not staying overnight?",
        answer:
          "Not on this package. Visitors are governed by the property rules and the approved occupancy, so a celebration with extra attendees goes through Birthday Celebrations instead.",
      },
      {
        question: "How many people can stay?",
        answer:
          "It depends on the unit. Each accommodation option states its own maximum, and you will see it before you confirm.",
      },
    ],
    mode: "quotation",
    status: "draft",
    pendingSettings: NOT_CONFIGURED,
  },
  {
    slug: "birthday-celebration",
    category: "birthday",
    variant: "hosted_event",
    name: "Birthday Celebration with Guests",
    summary: "A hosted birthday with additional attendees, quoted per event.",
    introduction:
      "A birthday with invited guests rather than just an overnight stay. Because it involves visitors, timings and additional rules, it is quoted per event once we have confirmed the property can accommodate it.",
    whoItsFor: [
      "Birthdays with friends or family attending",
      "Guests who need a venue, timings and catering arranged",
      "Anyone whose gathering includes people not staying overnight",
    ],
    inclusions: [],
    exclusions: [],
    eligibility: null,
    priceBasis: "per_event",
    amount: null,
    priceNote: null,
    capacity: { minGuests: null, maxGuests: null },
    minimumNoticeDays: null,
    leadTimeNote: null,
    extras: [],
    cancellationPolicyId: null,
    facilityRules: [],
    requiredQuestions: [
      { id: "eventDate", label: "Event date", type: "date", required: true },
      { id: "startTime", label: "Event start time", type: "time", required: true },
      { id: "endTime", label: "Event end time", type: "time", required: true },
      {
        id: "attendance",
        label: "Total expected attendance",
        type: "number",
        required: true,
        helpText: "Everyone attending, including those staying overnight.",
      },
      {
        id: "overnightGuests",
        label: "Number staying overnight",
        type: "number",
        required: true,
        helpText: "Enter 0 if nobody is staying over.",
      },
      { id: "preferredProperty", label: "Preferred property", type: "select", required: false, options: [] },
      { id: "catering", label: "Catering requirements", type: "textarea", required: false },
      { id: "music", label: "Music or entertainment plans", type: "textarea", required: false },
      { id: "indoorOutdoor", label: "Indoor or outdoor", type: "select", required: false, options: ["Indoor", "Outdoor", "Either"] },
      { id: "theme", label: "Theme or colour scheme", type: "text", required: false },
      { id: "vendors", label: "Outside vendors you plan to bring", type: "textarea", required: false },
    ],
    faqs: [
      {
        question: "Does booking a room mean I can hold a party?",
        answer:
          "No. A room reservation never grants permission to hold an event. Events are approved separately against the property's rules and approved attendance limit.",
      },
      {
        question: "Can the property take more guests than its stated capacity?",
        answer:
          "No. Every property has an approved maximum occupancy, and we cannot exceed it. If your plans are larger we will tell you honestly rather than stretching the limit.",
      },
    ],
    mode: "quotation",
    status: "draft",
    pendingSettings: NOT_CONFIGURED,
  },
  {
    slug: "private-gathering",
    category: "private_gathering",
    variant: "day_event",
    name: "Private Gathering & Casual Party",
    summary: "A private event at one of our properties, by approval.",
    introduction:
      "A casual party, a private gathering or a small function. Every request is reviewed against the property's approved use, capacity and hours before anything is confirmed, and we quote per event.",
    whoItsFor: [
      "Private celebrations and casual parties",
      "Small functions that need a venue rather than a stay",
      "Guests who may also need overnight accommodation for some attendees",
    ],
    inclusions: [],
    exclusions: [],
    eligibility: null,
    priceBasis: "per_event",
    amount: null,
    priceNote: null,
    capacity: { minGuests: null, maxGuests: null },
    minimumNoticeDays: null,
    leadTimeNote: null,
    extras: [],
    cancellationPolicyId: null,
    facilityRules: [],
    requiredQuestions: [
      { id: "gatheringType", label: "Type of gathering", type: "text", required: true },
      { id: "eventDate", label: "Event date", type: "date", required: true },
      { id: "startTime", label: "Start time", type: "time", required: true },
      { id: "endTime", label: "End time", type: "time", required: true },
      { id: "attendance", label: "Expected attendance", type: "number", required: true },
      {
        id: "overnightNeeds",
        label: "Overnight accommodation required?",
        type: "select",
        required: true,
        options: ["No", "Yes — for some attendees", "Yes — for most attendees"],
      },
      { id: "overnightGuests", label: "Number staying overnight", type: "number", required: false },
      { id: "preferredProperty", label: "Preferred venue or property", type: "select", required: false, options: [] },
      { id: "catering", label: "Catering and drinks", type: "textarea", required: false },
      { id: "music", label: "Music or entertainment", type: "textarea", required: false },
      { id: "vendors", label: "Outside vendors", type: "textarea", required: false },
      { id: "setupCleanup", label: "Setup and cleanup requirements", type: "textarea", required: false },
      {
        id: "budgetRange",
        label: "Budget range (optional)",
        type: "text",
        required: false,
        helpText: "Optional. Helps us quote something you will actually accept.",
      },
      { id: "notes", label: "Anything else we should know", type: "textarea", required: false },
    ],
    faqs: [
      {
        question: "Is the price fixed?",
        answer:
          "No. Gatherings are quoted per event, because the cost depends on attendance, timings and what needs arranging.",
      },
      {
        question: "Can I book my preferred property straight away?",
        answer:
          "You can request it. We confirm only after checking the property's approved use, its rules and whether it is free on your date.",
      },
    ],
    mode: "quotation",
    status: "draft",
    pendingSettings: NOT_CONFIGURED,
  },
];

export function getPackage(slug: string): PackageDefinition | null {
  return PACKAGES.find((entry) => entry.slug === slug) ?? null;
}

export function packagesByCategory(category: PackageCategory): PackageDefinition[] {
  return PACKAGES.filter((entry) => entry.category === category);
}

/** Only these may be advertised as instantly bookable. */
export function publishedPackages(): PackageDefinition[] {
  return PACKAGES.filter((entry) => entry.status === "published");
}

// ---------------------------------------------------------------------------
// Publish gate
// ---------------------------------------------------------------------------

export interface PublishIssue {
  field: string;
  message: string;
}

/**
 * Why a package may not be published, and which fields are missing.
 *
 * A package in `quotation` mode only needs enough to describe the offer and
 * collect an enquiry. A `fixed_price` package claimed as instantly bookable must
 * have every commercial term settled first — price, eligibility, capacity,
 * availability and policy — because at that point the site is committing the
 * business to a price and a date without a human in the loop.
 */
export function canPublish(pkg: PackageDefinition): { ok: boolean; issues: PublishIssue[] } {
  const issues: PublishIssue[] = [];

  if (!pkg.name.trim()) issues.push({ field: "name", message: "A package name is required." });
  if (!pkg.summary.trim()) issues.push({ field: "summary", message: "A one-line summary is required." });
  if (!pkg.inclusions.length) {
    issues.push({ field: "inclusions", message: "At least one inclusion must be listed — the guest has to know what they get." });
  }

  if (pkg.mode === "fixed_price") {
    if (pkg.amount === null || pkg.amount <= 0) {
      issues.push({ field: "amount", message: "An approved price is required for instant booking." });
    }
    if (!pkg.priceNote?.trim()) {
      issues.push({ field: "priceNote", message: "State the pricing basis, for example 'per night, for two guests'." });
    }
    if (!pkg.eligibility || !pkg.eligibility.propertyIds.length) {
      issues.push({ field: "eligibility", message: "Instant booking needs at least one eligible property, so availability can be checked." });
    }
    if (pkg.capacity.maxGuests === null) {
      issues.push({ field: "capacity", message: "A maximum capacity is required so the package cannot be oversold." });
    }
    if (pkg.minimumNoticeDays === null) {
      issues.push({ field: "minimumNoticeDays", message: "A minimum notice period is required, so setups cannot be booked for tomorrow without warning." });
    }
    if (!pkg.cancellationPolicyId) {
      issues.push({ field: "cancellationPolicyId", message: "Cancellation and rescheduling terms must be approved before taking payment." });
    }
    for (const extra of pkg.extras) {
      if (extra.amount === null && !extra.requiresQuote) {
        issues.push({
          field: `extra.${extra.id}`,
          message: `Extra "${extra.name}" has no price. Price it, or mark it as quotation-only.`,
        });
      }
    }
  } else {
    // Quotation mode still needs enough to route and price the request.
    if (pkg.capacity.maxGuests === null) {
      issues.push({ field: "capacity", message: "A maximum capacity is needed so we do not accept a request we cannot host." });
    }
    if (!pkg.requiredQuestions.some((question) => question.required)) {
      issues.push({ field: "requiredQuestions", message: "At least one required question is needed to collect the details for a quote." });
    }
  }

  return { ok: issues.length === 0, issues };
}

/** Whether the guest-facing action is a booking or a request. */
export function isInstantlyBookable(pkg: PackageDefinition): boolean {
  return pkg.status === "published" && pkg.mode === "fixed_price" && canPublish(pkg).ok;
}

/**
 * The correct label for the package's call to action.
 *
 * "Book now" is banned unless the package genuinely books instantly. Sending
 * someone to a form that only registers an enquiry under a "Book now" button is
 * the wording defect this function exists to prevent.
 */
export function primaryActionLabel(pkg: PackageDefinition): string {
  if (isInstantlyBookable(pkg)) return "Book this package";
  if (pkg.mode === "quotation") {
    return pkg.category === "private_gathering" ? "Plan your gathering" : "Request a quote";
  }
  return "Request availability";
}

export const CATEGORY_LABELS: Record<PackageCategory, string> = {
  honeymoon: "Honeymoon & Romance",
  birthday: "Birthday Celebration",
  private_gathering: "Private Gathering",
};
