// app/lib/deposit.ts
// ---------------------------------------------------------------------------
// The deposit policy: how much a guest may pay now versus later.
//
// NOTHING IS INVENTED
//
//   There is no approved deposit in the repository or the brief, so the policy
//   ships *unconfigured*. Until the owner sets it — in admin, or through the
//   DEPOSIT_* environment variables — the checkout offers "Pay in full" only and
//   shows an enquiry route instead of a made-up percentage. A deposit figure
//   that nobody agreed is a payment commitment, not a placeholder.
//
// WHY THE POLICY IS PUBLIC
//
//   The checkout has to show the guest what is due now, what remains and when
//   the balance falls due *before* they are sent to the gateway. That is not
//   sensitive information, so it lives in `site_settings` with a public read
//   policy rather than behind the service role.
//
// THE ARITHMETIC IS SHARED
//
//   The browser renders the summary and the server decides what to charge. Both
//   call the functions here, so the two cannot disagree; the server still
//   re-reads the policy itself and never trusts a figure from the request.
// ---------------------------------------------------------------------------

import { addDaysToKey } from "./dates";

/** Payment plan chosen by the guest. */
export type PaymentPlan = "full" | "deposit";

/** How the deposit is expressed. */
export type DepositMode = "percent" | "fixed";

export interface DepositPolicy {
  /** Null when the owner has not configured a deposit at all. */
  mode: DepositMode | null;
  /** 1–99, used when mode is "percent". */
  percent: number | null;
  /** Major units, used when mode is "fixed". */
  fixedAmount: number | null;
  /** Days before check-in the balance must be settled by. Null = not stated. */
  balanceDueDays: number | null;
  /** Owner's own wording for how the balance is paid. */
  instructions: string | null;
}

export const NO_DEPOSIT_POLICY: DepositPolicy = {
  mode: null,
  percent: null,
  fixedAmount: null,
  balanceDueDays: null,
  instructions: null,
};

function round2(value: number): number {
  return Math.round(value * 100) / 100;
}

function positiveNumber(value: unknown): number | null {
  const number = typeof value === "string" ? Number(value) : value;
  if (typeof number === "number" && Number.isFinite(number) && number > 0) {
    return number;
  }
  return null;
}

/**
 * Coerce whatever is stored (JSON column, environment string, or nothing) into
 * a policy that the rest of the app can rely on. An invalid policy degrades to
 * "unconfigured" rather than to a plausible-looking wrong number.
 */
export function parseDepositPolicy(raw: unknown): DepositPolicy {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return NO_DEPOSIT_POLICY;

  const record = raw as Record<string, unknown>;
  const mode = record.mode === "percent" || record.mode === "fixed" ? record.mode : null;

  const percentRaw = positiveNumber(record.percent);
  const fixedRaw = positiveNumber(record.fixedAmount);
  const daysRaw =
    record.balanceDueDays === 0
      ? 0
      : positiveNumber(record.balanceDueDays);

  if (mode === "percent" && (percentRaw === null || percentRaw >= 100)) {
    return NO_DEPOSIT_POLICY;
  }
  if (mode === "fixed" && fixedRaw === null) {
    return NO_DEPOSIT_POLICY;
  }
  if (!mode) return NO_DEPOSIT_POLICY;

  return {
    mode,
    percent: mode === "percent" ? percentRaw : null,
    fixedAmount: mode === "fixed" ? fixedRaw : null,
    balanceDueDays: daysRaw === null ? null : Math.max(0, Math.floor(daysRaw)),
    instructions:
      typeof record.instructions === "string" && record.instructions.trim()
        ? record.instructions.trim()
        : null,
  };
}

export function isDepositConfigured(policy: DepositPolicy): boolean {
  if (policy.mode === "percent") return policy.percent !== null && policy.percent < 100;
  if (policy.mode === "fixed") return policy.fixedAmount !== null;
  return false;
}

/**
 * The deposit for a given total, in major units.
 *
 * Capped at the total so a fixed deposit larger than the stay can never take
 * more than the stay is worth.
 */
export function depositAmountFor(total: number, policy: DepositPolicy): number {
  if (!isDepositConfigured(policy) || total <= 0) return 0;
  const raw =
    policy.mode === "percent"
      ? (total * (policy.percent as number)) / 100
      : (policy.fixedAmount as number);
  return round2(Math.min(Math.max(0, raw), total));
}

export interface DueBreakdown {
  /** What is payable now. */
  dueNow: number;
  /** What remains after the payment. */
  balance: number;
  /** The deposit actually applied (0 when paying in full). */
  deposit: number;
  plan: PaymentPlan;
  /** True when the plan asked for a deposit but none is configured. */
  unavailable: boolean;
}

/**
 * Resolve a plan against a total.
 *
 * A guest who asks for a deposit when the owner has not configured one gets
 * `unavailable: true` and no amount — the caller offers an enquiry instead of
 * charging a number that does not exist.
 */
export function resolveDue(
  total: number,
  policy: DepositPolicy,
  plan: PaymentPlan,
): DueBreakdown {
  const safeTotal = round2(Math.max(0, total));

  if (plan === "deposit") {
    if (!isDepositConfigured(policy)) {
      return { dueNow: safeTotal, balance: 0, deposit: 0, plan, unavailable: true };
    }
    const deposit = depositAmountFor(safeTotal, policy);
    if (deposit <= 0 || deposit >= safeTotal) {
      // A deposit equal to (or larger than) the total is just pay-in-full.
      return { dueNow: safeTotal, balance: 0, deposit: 0, plan, unavailable: false };
    }
    return {
      dueNow: deposit,
      balance: round2(safeTotal - deposit),
      deposit,
      plan,
      unavailable: false,
    };
  }

  return { dueNow: safeTotal, balance: 0, deposit: 0, plan: "full", unavailable: false };
}

/** The date the balance falls due, or null when the owner has not set one. */
export function balanceDueDateKey(
  checkInKey: string,
  policy: DepositPolicy,
): string | null {
  if (policy.balanceDueDays === null) return null;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(checkInKey)) return null;
  return addDaysToKey(checkInKey, -policy.balanceDueDays);
}

/** One-line explanation of the balance terms, in the owner's words where set. */
export function balanceTermsNote(policy: DepositPolicy): string | null {
  if (policy.instructions) return policy.instructions;
  if (policy.balanceDueDays === null) return null;
  if (policy.balanceDueDays === 0) return "The balance is due on the check-in date.";
  return `The balance is due ${policy.balanceDueDays} day${
    policy.balanceDueDays === 1 ? "" : "s"
  } before check-in.`;
}

// ---------------------------------------------------------------------------
// Environment fallback
//
// The database is the owner's preferred route (admin → Settings). These
// variables exist so a deployment can be configured before the SQL migration
// has been run, and so local development can exercise the deposit flow.
// ---------------------------------------------------------------------------

function envValue(scope: "server" | "client", name: string): string | undefined {
  if (scope === "client") {
    // Only NEXT_PUBLIC_* survives into the browser bundle.
    return process.env[`NEXT_PUBLIC_DEPOSIT_${name}`];
  }
  return process.env[`DEPOSIT_${name}`] ?? process.env[`NEXT_PUBLIC_DEPOSIT_${name}`];
}

export function policyFromEnv(scope: "server" | "client" = "server"): DepositPolicy {
  const modeRaw = (envValue(scope, "MODE") ?? "").toLowerCase();
  if (modeRaw !== "percent" && modeRaw !== "fixed") return NO_DEPOSIT_POLICY;

  return parseDepositPolicy({
    mode: modeRaw,
    percent: envValue(scope, "PERCENT"),
    fixedAmount: envValue(scope, "AMOUNT"),
    balanceDueDays: envValue(scope, "BALANCE_DAYS"),
    instructions: envValue(scope, "INSTRUCTIONS"),
  });
}

/** Human summary of the configured policy, for the admin screen. */
export function describeDepositPolicy(policy: DepositPolicy): string {
  if (!isDepositConfigured(policy)) return "No deposit configured — guests pay in full.";
  const amount =
    policy.mode === "percent"
      ? `${policy.percent}% of the booking total`
      : `GHS ${(policy.fixedAmount as number).toLocaleString()}`;
  const terms = balanceTermsNote(policy);
  return terms ? `Deposit of ${amount}. ${terms}` : `Deposit of ${amount}.`;
}
