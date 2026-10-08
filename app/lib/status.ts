// app/lib/status.ts
// ---------------------------------------------------------------------------
// Accommodation and occasion progress, tracked separately.
//
// THE PROBLEM THIS FIXES
//
//   A single `status` column could not express "the room is paid for, the party
//   has not been approved". So the checkout marked everything `confirmed` the
//   moment Paystack returned success — and the guest was told their celebration
//   was confirmed when nobody had reviewed it, nobody had quoted it, and the
//   add-on was not even included in the amount they paid.
//
//   Two independent tracks now. Accommodation can be confirmed while the occasion
//   is still `requested`. The combination is never collapsed into a bare
//   "Booking confirmed": when only part of the request is settled, the customer
//   is told exactly which part.
// ---------------------------------------------------------------------------

/** The stay itself. */
export type AccommodationStatus = "pending_payment" | "confirmed" | "cancelled";

/** The occasion package or event. Progresses independently of the stay. */
export type OccasionStatus =
  /** Nothing occasion-related on this booking. */
  | "none"
  /** Enquiry submitted. Not confirmed, no price agreed. */
  | "requested"
  /** Staff are checking capacity, inventory, rules and suppliers. */
  | "under_review"
  /** An itemised quote has been sent and has not expired. */
  | "quoted"
  /** The guest has accepted the quote and payment is outstanding. */
  | "awaiting_payment"
  | "confirmed"
  | "cancelled";

export interface StatusTracks {
  accommodation: AccommodationStatus;
  occasion: OccasionStatus;
}

export type OverallCode =
  | "confirmed"
  | "partially_confirmed"
  | "awaiting_review"
  | "awaiting_quote"
  | "awaiting_payment"
  | "cancelled"
  | "not_confirmed";

export interface OverallStatus {
  code: OverallCode;
  /** Short label for a badge. */
  label: string;
  /** One sentence a customer can act on. */
  detail: string;
  /** Drives badge colour. */
  tone: "positive" | "warning" | "neutral" | "negative";
}

const ACCOMMODATION_LABELS: Record<AccommodationStatus, string> = {
  pending_payment: "Accommodation: payment pending",
  confirmed: "Accommodation confirmed",
  cancelled: "Accommodation cancelled",
};

const OCCASION_LABELS: Record<OccasionStatus, string> = {
  none: "No occasion booked",
  requested: "Occasion: request received",
  under_review: "Occasion: under review",
  quoted: "Occasion: quote sent",
  awaiting_payment: "Occasion: awaiting payment",
  confirmed: "Occasion confirmed",
  cancelled: "Occasion cancelled",
};

/**
 * The single status a customer should see.
 *
 * The `partially_confirmed` case is the important one: it is the honest reading
 * of "you have paid for a room; your celebration is not yet agreed".
 */
export function overallStatus(tracks: StatusTracks): OverallStatus {
  const { accommodation, occasion } = tracks;

  if (accommodation === "cancelled" && (occasion === "cancelled" || occasion === "none")) {
    return {
      code: "cancelled",
      label: "Cancelled",
      detail: "This booking has been cancelled. Contact us if you would like to rebook.",
      tone: "negative",
    };
  }

  if (occasion === "requested" || occasion === "under_review") {
    if (accommodation === "confirmed") {
      return {
        code: "partially_confirmed",
        label: "Accommodation confirmed — occasion awaiting approval",
        detail:
          "Your stay is confirmed and paid for. Your occasion request is still being reviewed, so it is not yet confirmed and no charge has been made for it.",
        tone: "warning",
      };
    }
    return {
      code: "awaiting_review",
      label: "Occasion request received",
      detail:
        "We have your request and are checking that we can host it. Nothing is confirmed and nothing has been charged for the occasion yet.",
      tone: "neutral",
    };
  }

  if (occasion === "quoted") {
    return {
      code: "awaiting_quote",
      label: accommodation === "confirmed" ? "Quote ready — accommodation confirmed" : "Quote ready",
      detail:
        "We have sent you an itemised quote. It is not confirmed until you accept it and the payment terms are met.",
      tone: "warning",
    };
  }

  if (occasion === "awaiting_payment") {
    return {
      code: "awaiting_payment",
      label: "Quote accepted — payment outstanding",
      detail:
        "You have accepted the quote. The occasion is confirmed once payment has been received.",
      tone: "warning",
    };
  }

  if (occasion === "confirmed" && accommodation === "confirmed") {
    return {
      code: "confirmed",
      label: "Booking confirmed",
      detail: "Your stay and your occasion are both confirmed. We look forward to hosting you.",
      tone: "positive",
    };
  }

  if (occasion === "confirmed") {
    return {
      code: "partially_confirmed",
      label: "Occasion confirmed — accommodation payment pending",
      detail:
        "Your occasion is confirmed. The accommodation payment is still outstanding.",
      tone: "warning",
    };
  }

  if (accommodation === "confirmed") {
    return {
      code: "confirmed",
      label: "Booking confirmed",
      detail: "Your stay is confirmed. We look forward to hosting you.",
      tone: "positive",
    };
  }

  if (accommodation === "pending_payment") {
    return {
      code: "awaiting_payment",
      label: "Awaiting payment",
      detail: "Your dates are held but not confirmed. The booking confirms once payment is received.",
      tone: "warning",
    };
  }

  return {
    code: "not_confirmed",
    label: "Not confirmed",
    detail: "This request is not confirmed.",
    tone: "neutral",
  };
}

export function accommodationLabel(status: AccommodationStatus): string {
  return ACCOMMODATION_LABELS[status];
}

export function occasionLabel(status: OccasionStatus): string {
  return OCCASION_LABELS[status];
}

/** Both tracks, for a detail panel. */
export function statusBreakdown(tracks: StatusTracks): { label: string; value: string }[] {
  const rows = [{ label: "Accommodation", value: accommodationLabel(tracks.accommodation) }];
  if (tracks.occasion !== "none") {
    rows.push({ label: "Occasion", value: occasionLabel(tracks.occasion) });
  }
  return rows;
}

/**
 * The notice shown before payment when a package is still unquoted.
 *
 * Required wording, and only shown when it is true: if the occasion is anything
 * other than `none` and not already priced and confirmed, the guest must be told
 * that their payment does not cover it.
 */
export function accommodationOnlyNotice(occasion: OccasionStatus): string | null {
  if (occasion === "none" || occasion === "confirmed") return null;
  return (
    "Your payment covers accommodation only. Your celebration package requires a " +
    "separate quote and confirmation, and is not included in the amount charged today."
  );
}

/** True when the occasion cannot yet be paid for, so the booking is stay-only. */
export function isAccommodationOnly(occasion: OccasionStatus): boolean {
  return occasion === "none" || occasion === "requested" || occasion === "under_review";
}

/** Map a legacy single `status` column onto the two tracks. */
export function migrateLegacyStatus(
  status: string | null | undefined,
  packages: unknown,
): StatusTracks {
  const hasOccasion = Array.isArray(packages) && packages.length > 0;

  switch (status) {
    case "confirmed":
      // A confirmed legacy row that carried add-ons could not have had those
      // add-ons priced or approved, because no such workflow existed. It is
      // therefore accommodation-confirmed with an unreviewed occasion, which is
      // exactly what the guest was never told.
      return {
        accommodation: "confirmed",
        occasion: hasOccasion ? "requested" : "none",
      };
    case "cancelled":
      return { accommodation: "cancelled", occasion: hasOccasion ? "cancelled" : "none" };
    case "pending":
    default:
      return {
        accommodation: "pending_payment",
        occasion: hasOccasion ? "requested" : "none",
      };
  }
}
