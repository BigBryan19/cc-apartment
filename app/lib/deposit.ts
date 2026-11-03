// app/lib/deposit.ts
// ---------------------------------------------------------------------------
// The deposit policy: how much a guest may pay now to hold the apartment.
//
// THE RULE (set by the business)
//
//   A guest can reserve with a part payment of **20% or more** of the booking
//   total, and the remainder is settled before arrival. So the deposit is not a
//   single fixed number — it is a guest-chosen share with a floor of 20%.
//
//   The owner can raise the floor (or turn part payment off) in Admin →
//   Settings. The floor is never allowed below the approved 20%, and a choice of
//   100% is simply "pay in full".
//
// WHO DECIDES THE MONEY
//
//   The guest sends the percentage they picked; the server clamps it to the
//   configured range and multiplies it by the total it calculated itself. No
//   amount is ever taken from the request body.
// ---------------------------------------------------------------------------

import { addDaysToKey } from "./dates";

/** The approved minimum share for a part payment. */
export const MIN_DEPOSIT_PERCENT = 20;

export type DepositMode = "percent" | "fixed";
export type PaymentPlan = "full" | "deposit";

export interface DepositPolicy {
  /** When false, checkout offers pay-in-full only. */
  enabled: boolean;
  /**
   * "percent" is the normal mode: the guest picks a share at or above
   * `minPercent`. "fixed" pins the deposit to one amount.
   */
  mode: DepositMode;
  /** The smallest share a guest may pay to reserve. Never below 20. */
  minPercent: number;
  /** Only used when `mode` is "fixed". */
  fixedAmount: number | null;
  /** Days before check-in the balance falls due. */
  balanceDueDays: number | null;
  /** Owner's own wording for how the balance is settled. */
  instructions: string | null;
}

/**
 * The policy in force when nothing has been configured: part payment at 20%,
 * because the business has approved that floor.
 */
export const DEFAULT_DEPOSIT_POLICY: DepositPolicy = {
  enabled: true,
  mode: "percent",
  minPercent: MIN_DEPOSIT_PERCENT,
  fixedAmount: null,
  balanceDueDays: null,
  instructions: null,
};

/** Part payment switched off entirely. */
export const NO_DEPOSIT_POLICY: DepositPolicy = {
  ...DEFAULT_DEPOSIT_POLICY,
  enabled: false,
};

export interface DueBreakdown {
  /** "full" or "deposit" — what the guest is actually doing. */
  plan: PaymentPlan;
  /** Charged today. */
  dueNow: number;
  /** Left for later. */
  balance: number;
  /** The part-payment portion; zero when paying in full. */
  deposit: number;
  /** The share that will be charged today (100 for a full payment). */
  percent: number;
  /**
   * True when a deposit was asked for but part payment is unavailable or the
   * total is unknown — the caller must fall back to pay-in-full rather than
   * inventing a figure.
   */
  unavailable: boolean;
}

function round2(value: number): number {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

function toFinite(value: unknown): number | null {
  const number = typeof value === "string" ? Number(value) : value;
  return typeof number === "number" && Number.isFinite(number) ? number : null;
}

/**
 * Coerce a stored value into a policy.
 *
 * Anything unusable falls back to the default 20% policy rather than to a
 * made-up number, and a floor below 20 is raised to 20 — the business rule is
 * not something a stored row should be able to undercut.
 */
export function parseDepositPolicy(raw: unknown): DepositPolicy {
  if (!raw) return DEFAULT_DEPOSIT_POLICY;

  let source: Record<string, unknown> | null = null;
  if (typeof raw === "string") {
    try {
      const parsed = JSON.parse(raw);
      source = parsed && typeof parsed === "object" ? (parsed as Record<string, unknown>) : null;
    } catch {
      return DEFAULT_DEPOSIT_POLICY;
    }
  } else if (typeof raw === "object") {
    source = raw as Record<string, unknown>;
  }

  if (!source) return DEFAULT_DEPOSIT_POLICY;

  const enabled = source.enabled === false ? false : true;
  const mode: DepositMode = source.mode === "fixed" ? "fixed" : "percent";

  const requestedMin = toFinite(source.minPercent ?? source.percent);
  const minPercent = Math.min(
    100,
    Math.max(MIN_DEPOSIT_PERCENT, requestedMin === null ? MIN_DEPOSIT_PERCENT : Math.round(requestedMin)),
  );

  const fixed = toFinite(source.fixedAmount);
  const fixedAmount = fixed !== null && fixed > 0 ? round2(fixed) : null;

  if (mode === "fixed" && fixedAmount === null) {
    // A fixed policy with no amount is not a policy.
    return { ...DEFAULT_DEPOSIT_POLICY, enabled };
  }

  const days = toFinite(source.balanceDueDays ?? source.balanceDays);
  const balanceDueDays =
    days !== null && days >= 0 ? Math.round(days) : null;

  const instructions =
    typeof source.instructions === "string" && source.instructions.trim()
      ? source.instructions.trim().slice(0, 240)
      : null;

  return { enabled, mode, minPercent, fixedAmount, balanceDueDays, instructions };
}

/**
 * Read the policy from the environment.
 *
 * `NEXT_PUBLIC_` variables are what the browser can see; the server checks the
 * private names first. Used as a fallback when the settings row is absent.
 */
export function policyFromEnv(scope: "server" | "client" = "server"): DepositPolicy {
  const read = (name: string): string | undefined => {
    const publicName = `NEXT_PUBLIC_${name}`;
    if (scope === "client") return process.env[publicName];
    return process.env[name] ?? process.env[publicName];
  };

  const enabled = read("DEPOSIT_ENABLED");
  const percent = read("DEPOSIT_MIN_PERCENT");
  const days = read("DEPOSIT_BALANCE_DAYS");
  const instructions = read("DEPOSIT_INSTRUCTIONS");

  if (enabled === undefined && percent === undefined && days === undefined && instructions === undefined) {
    return DEFAULT_DEPOSIT_POLICY;
  }

  return parseDepositPolicy({
    enabled: enabled === undefined ? true : enabled !== "false",
    mode: "percent",
    minPercent: percent,
    balanceDueDays: days,
    instructions,
  });
}

export function isDepositConfigured(policy: DepositPolicy): boolean {
  return policy.enabled;
}

/** Deposit amount for a total, honouring the floor and the fixed mode. */
export function depositAmountFor(
  total: number,
  policy: DepositPolicy,
  chosenPercent?: number | null,
): number {
  if (!Number.isFinite(total) || total <= 0) return 0;

  if (policy.mode === "fixed") {
    const fixed = policy.fixedAmount ?? 0;
    return round2(Math.min(Math.max(fixed, 0), total));
  }

  const percent = clampPercent(chosenPercent, policy);
  return round2((total * percent) / 100);
}

/** The share a guest may actually pay, given their choice and the floor. */
export function clampPercent(
  chosenPercent: number | null | undefined,
  policy: DepositPolicy,
): number {
  const floor = Math.min(100, Math.max(MIN_DEPOSIT_PERCENT, policy.minPercent));
  const chosen = toFinite(chosenPercent ?? null);
  if (chosen === null) return floor;
  return Math.min(100, Math.max(floor, Math.round(chosen)));
}

/**
 * Work out what is charged today.
 *
 * A deposit that comes out at or above the total is not a deposit — it is a
 * full payment, and reporting it as a part payment would leave a zero balance
 * and a confusing "pay the rest" instruction.
 */
export function resolveDue(
  total: number,
  policy: DepositPolicy,
  plan: PaymentPlan,
  chosenPercent?: number | null,
): DueBreakdown {
  const safeTotal = Number.isFinite(total) && total > 0 ? round2(total) : 0;

  if (plan === "full") {
    return { plan: "full", dueNow: safeTotal, balance: 0, deposit: 0, percent: 100, unavailable: false };
  }

  if (!isDepositConfigured(policy)) {
    return { plan: "full", dueNow: safeTotal, balance: 0, deposit: 0, percent: 100, unavailable: true };
  }

  if (safeTotal === 0) {
    // Nothing to divide yet (dates or unit not chosen).
    return { plan: "full", dueNow: 0, balance: 0, deposit: 0, percent: 100, unavailable: true };
  }

  const percent = clampPercent(chosenPercent, policy);
  const deposit = Math.min(depositAmountFor(safeTotal, policy, percent), safeTotal);

  if (deposit >= safeTotal) {
    return { plan: "full", dueNow: safeTotal, balance: 0, deposit: 0, percent: 100, unavailable: false };
  }

  return {
    plan: "deposit",
    dueNow: deposit,
    balance: round2(safeTotal - deposit),
    deposit,
    percent,
    unavailable: false,
  };
}

/** The date the balance is due, or null when no term is configured. */
export function balanceDueDateKey(
  checkIn: string | null | undefined,
  policy: DepositPolicy,
): string | null {
  if (!checkIn || policy.balanceDueDays === null) return null;
  try {
    return addDaysToKey(checkIn, -policy.balanceDueDays);
  } catch {
    return null;
  }
}

/** One line describing how the balance is settled. */
export function balanceTermsNote(policy: DepositPolicy): string | null {
  const parts: string[] = [];

  if (policy.balanceDueDays !== null && policy.balanceDueDays > 0) {
    parts.push(`Balance due ${policy.balanceDueDays} day${policy.balanceDueDays === 1 ? "" : "s"} before check-in.`);
  } else if (policy.balanceDueDays === 0) {
    parts.push("Balance due on arrival.");
  }

  if (policy.instructions) parts.push(policy.instructions);

  return parts.length ? parts.join(" ") : null;
}

/** Human summary used by the admin screen. */
export function describeDepositPolicy(policy: DepositPolicy): string {
  if (!policy.enabled) {
    return "Part payment is off. Guests can only pay in full.";
  }
  if (policy.mode === "fixed") {
    return `Guests pay a fixed deposit of GHS ${(policy.fixedAmount ?? 0).toLocaleString()} to reserve.`;
  }
  return `Guests can reserve by paying ${policy.minPercent}%–99% of the total; the rest falls due before arrival.`;
}
