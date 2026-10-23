// app/lib/payaza.ts
// ---------------------------------------------------------------------------
// Payaza Africa Payment Integration
//
// API Docs: https://docs.payaza.africa/
// ---------------------------------------------------------------------------

import crypto from "crypto";

const PAYAZA_CHECKOUT_URL = "https://payment.payaza.africa/";
const PAYAZA_API_BASE_URL = "https://api.payaza.africa/live/merchant-collection/transfer_notification_controller/merchant";

/**
 * Unique, human-readable transaction reference.
 */
export function generateReference(prefix = "CC"): string {
  const stamp = Date.now().toString(36).toUpperCase();
  // Using 12 random bytes for even higher entropy to avoid collision
  const rand = crypto.randomBytes(12).toString("hex").toUpperCase();
  return `${prefix}-${stamp}-${rand}`;
}

export interface PayazaCheckoutParams {
  merchant_key: string;
  connection_mode: "Live" | "Test";
  checkout_amount: number;
  currency_code: string;
  email_address: string;
  first_name: string;
  last_name: string;
  phone_number: string;
  transaction_reference: string;
  redirect_url: string;
}

export function isPayazaConfigured(): boolean {
  return Boolean(process.env.PAYAZA_MERCHANT_KEY && process.env.PAYAZA_API_KEY);
}

/**
 * Builds the hosted checkout URL for Payaza.
 * Unlike Paystack, this can be done client-side or server-side without a pre-auth call.
 */
export function generateCheckoutUrl(params: PayazaCheckoutParams): string {
  const url = new URL(PAYAZA_CHECKOUT_URL);
  
  // Payaza expects these exact query parameters
  url.searchParams.append("merchant_key", params.merchant_key);
  url.searchParams.append("connection_mode", params.connection_mode);
  // Using toFixed(2) ensures we send "1.00" instead of just "1"
  url.searchParams.append("checkout_amount", params.checkout_amount.toFixed(2));
  url.searchParams.append("currency_code", params.currency_code);
  url.searchParams.append("email_address", params.email_address);
  url.searchParams.append("first_name", params.first_name);
  url.searchParams.append("last_name", params.last_name);
  url.searchParams.append("phone_number", params.phone_number);
  url.searchParams.append("transaction_reference", params.transaction_reference);
  
  // redirect_url MUST be the last parameter according to docs
  url.searchParams.append("redirect_url", params.redirect_url);

  return url.toString();
}

/**
 * Verifies the x-payaza-signature header.
 * Payload is the raw request body.
 * Signature is Base64 encoded HMAC-SHA512.
 */
export function verifyWebhookSignature(payload: string, signature: string | null): boolean {
  if (!signature) return false;

  const secret = process.env.PAYAZA_API_KEY;
  if (!secret) return false;

  const hash = crypto
    .createHmac("sha512", secret)
    .update(payload, "utf8")
    .digest("base64");

  return hash === signature;
}

export interface PayazaWebhookEvent {
  transaction_reference: string;
  transaction_status: "Funds Received" | "Transaction Failed";
  amount_received: number;
  merchant_reference: string;
  currency_code: string;
  status: "Completed" | "Failed";
  customer: {
    email_address: string;
    first_name: string;
    last_name: string;
  };
}

export interface PayazaTransactionResponse {
  success: boolean;
  message: string;
  data: {
    transaction_reference: string;
    merchant_transaction_reference: string;
    amount_received: number;
    transaction_status: "Completed" | "Failed" | "Pending";
    currency: string;
    status_reason: string;
  };
}

/**
 * Queries Payaza for the status of a specific transaction reference.
 */
export async function verifyTransaction(reference: string): Promise<PayazaTransactionResponse | null> {
  const apiKey = process.env.PAYAZA_API_KEY;
  if (!apiKey) {
    console.error("PAYAZA_API_KEY is missing");
    return null;
  }

  const encodedKey = Buffer.from(apiKey).toString("base64");
  
  try {
    const url = `${PAYAZA_API_BASE_URL}/transaction-query?merchant_reference=${reference}`;
    const response = await fetch(url, {
      method: "GET",
      headers: {
        "Authorization": `Payaza ${encodedKey}`,
        "Content-Type": "application/json",
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`Payaza verify error (${response.status}):`, errorText);
      return null;
    }

    return await response.json();
  } catch (error) {
    console.error("Payaza verify network error:", error);
    return null;
  }
}
