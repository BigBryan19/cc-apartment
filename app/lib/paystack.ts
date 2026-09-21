// app/lib/paystack.ts
// ---------------------------------------------------------------------------
// Server-side Paystack helpers.
//
// SECURITY: this module reads PAYSTACK_SECRET_KEY and must never be imported
// from a Client Component. Only Route Handlers import it.
// ---------------------------------------------------------------------------

import "server-only";
import crypto from "node:crypto";

const PAYSTACK_BASE_URL = "https://api.paystack.co";

/** Currencies Paystack accepts. Ghana bookings settle in GHS. */
export type PaystackCurrency = "GHS" | "NGN" | "USD" | "ZAR" | "KES";

/**
 * Paystack expects the amount in the currency's smallest unit
 * (pesewas for GHS, kobo for NGN, cents for USD).
 */
export function toSubunit(amount: number): number {
  return Math.round(Number(amount) * 100);
}

export function isPaystackConfigured(): boolean {
  return Boolean(process.env.PAYSTACK_SECRET_KEY);
}

function getSecretKey(): string {
  const key = process.env.PAYSTACK_SECRET_KEY;
  if (!key) {
    throw new Error(
      "PAYSTACK_SECRET_KEY is not set. Add it to .env.local / Vercel env vars.",
    );
  }
  return key;
}

/**
 * Unique, human-readable transaction reference.
 *
 * 8 random bytes (64 bits) rather than 4. This string doubles as the access
 * token for the guest's receipt at /receipt/<reference>, which exposes their
 * name, email and phone number — 32 bits was too little for something a
 * stranger could try to guess. Still well inside Paystack's 50-char limit.
 */
export function generateReference(prefix = "CC"): string {
  const stamp = Date.now().toString(36).toUpperCase();
  const rand = crypto.randomBytes(8).toString("hex").toUpperCase();
  return `${prefix}-${stamp}-${rand}`;
}

export interface InitializePayload {
  email: string;
  /** Major units (e.g. 3500 GHS) — converted to subunits internally. */
  amount: number;
  currency: PaystackCurrency;
  reference: string;
  callbackUrl?: string;
  metadata?: Record<string, unknown>;
  /** Restrict the channels shown on the Paystack page. */
  channels?: Array<"card" | "bank" | "ussd" | "qr" | "mobile_money" | "bank_transfer">;
}

export interface InitializeResult {
  authorization_url: string;
  access_code: string;
  reference: string;
}

interface PaystackEnvelope<T> {
  status: boolean;
  message: string;
  data: T;
}

/**
 * Create a Paystack transaction and return the hosted checkout URL.
 * Throws with Paystack's own error message when the request is rejected.
 */
export async function initializeTransaction(
  payload: InitializePayload,
): Promise<InitializeResult> {
  const body = {
    email: payload.email,
    amount: toSubunit(payload.amount),
    currency: payload.currency,
    reference: payload.reference,
    ...(payload.callbackUrl ? { callback_url: payload.callbackUrl } : {}),
    ...(payload.metadata ? { metadata: payload.metadata } : {}),
    ...(payload.channels && payload.channels.length
      ? { channels: payload.channels }
      : {}),
  };

  const response = await fetch(`${PAYSTACK_BASE_URL}/transaction/initialize`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${getSecretKey()}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
    cache: "no-store",
  });

  const json = (await response.json()) as PaystackEnvelope<InitializeResult>;

  if (!response.ok || !json.status) {
    throw new Error(json?.message || `Paystack initialize failed (${response.status})`);
  }

  return json.data;
}

export interface VerifyResult {
  status: string;
  reference: string;
  amount: number;
  currency: string;
  paid_at?: string | null;
  customer?: { email?: string };
  metadata?: Record<string, unknown> | null;
}

/** Server-side confirmation of a transaction (never trust the callback alone). */
export async function verifyTransaction(reference: string): Promise<VerifyResult> {
  const response = await fetch(
    `${PAYSTACK_BASE_URL}/transaction/verify/${encodeURIComponent(reference)}`,
    {
      headers: { Authorization: `Bearer ${getSecretKey()}` },
      cache: "no-store",
    },
  );

  const json = (await response.json()) as PaystackEnvelope<VerifyResult>;

  if (!response.ok || !json.status) {
    throw new Error(json?.message || `Paystack verify failed (${response.status})`);
  }

  return json.data;
}

/**
 * Validate the `x-paystack-signature` header.
 *
 * Paystack signs the **raw** request body with HMAC-SHA512 using the secret
 * key. The comparison is timing-safe to avoid leaking the digest.
 */
export function verifyWebhookSignature(
  rawBody: string,
  signature: string | null,
): boolean {
  if (!signature) return false;

  const expected = crypto
    .createHmac("sha512", getSecretKey())
    .update(rawBody, "utf8")
    .digest("hex");

  const expectedBuffer = Buffer.from(expected, "utf8");
  const providedBuffer = Buffer.from(signature, "utf8");

  if (expectedBuffer.length !== providedBuffer.length) return false;
  return crypto.timingSafeEqual(expectedBuffer, providedBuffer);
}

/** Payload subset of the `charge.success` webhook event we rely on. */
export interface PaystackWebhookEvent {
  event: string;
  data: {
    id?: number;
    reference: string;
    status: string;
    amount: number;
    currency: string;
    paid_at?: string | null;
    customer?: { email?: string };
    metadata?: Record<string, unknown> | null;
  };
}
