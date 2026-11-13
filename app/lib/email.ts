// app/lib/email.ts
// ---------------------------------------------------------------------------
// Transactional email.
//
// Uses Resend (https://resend.com) — a single HTTPS call, no SDK, which keeps
// it easy to swap for SendGrid/Postmark later; only `sendEmail` would change.
//
// Deliberately soft-failing: a receipt that cannot be sent must never break the
// payment flow or make Paystack retry a webhook that already succeeded.
// ---------------------------------------------------------------------------

import "server-only";

const RESEND_ENDPOINT = "https://api.resend.com/emails";

export const RECEIPT_FROM_FALLBACK = "Cosy Crest <onboarding@resend.dev>";

export function isEmailConfigured(): boolean {
  return Boolean(process.env.RESEND_API_KEY);
}

export function receiptFromAddress(): string {
  return process.env.RECEIPT_FROM_EMAIL?.trim() || RECEIPT_FROM_FALLBACK;
}

export interface SendResult {
  sent: boolean;
  id?: string;
  error?: string;
}

export async function sendEmail(params: {
  to: string;
  subject: string;
  html: string;
  text?: string;
  replyTo?: string;
}): Promise<SendResult> {
  // Trimmed: a key pasted into a hosting dashboard can arrive with a trailing
  // newline, and Resend answers that with 401 invalid_api_key.
  const apiKey = (process.env.RESEND_API_KEY ?? "").trim();

  if (!apiKey) {
    console.error(
      "[email] RESEND_API_KEY is empty in this deployment. Check that the variable is set for the Production environment in Vercel, then redeploy — environment changes do not reach an existing deployment.",
      { to: params.to, subject: params.subject },
    );
    // Not an error — the booking is still valid, the guest just does not get
    // an email until the key is added.
    console.info(
      "[email] RESEND_API_KEY is not set — skipping send to",
      params.to,
    );
    return { sent: false, error: "Email is not configured." };
  }

  if (!params.to.includes("@")) {
    console.error("[email] recipient is not an address", { to: params.to });
    return { sent: false, error: "Guest has no usable email address." };
  }

  try {
    const response = await fetch(RESEND_ENDPOINT, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: receiptFromAddress(),
        to: [params.to],
        subject: params.subject,
        html: params.html,
        ...(params.text ? { text: params.text } : {}),
        ...(params.replyTo ? { reply_to: params.replyTo } : {}),
      }),
    });

    const raw = await response.text();
    const payload = (() => {
      try {
        return JSON.parse(raw) as {
          id?: string;
          message?: string;
          name?: string;
          statusCode?: number;
        };
      } catch {
        return null;
      }
    })();

    if (!response.ok) {
      // The full body, because Resend puts the useful part in `message` and the
      // error class in `name` ("validation_error", "invalid_api_key",
      // "restricted_api_key"). Without it the symptom is just "not sent".
      console.error("[email] Resend rejected the message", {
        httpStatus: response.status,
        body: raw,
        from: receiptFromAddress(),
        to: params.to,
        subject: params.subject,
        keyLength: apiKey.length,
        keyHadWhitespace: (process.env.RESEND_API_KEY ?? "") !== apiKey,
      });

      const message = payload?.message ?? `HTTP ${response.status}`;

      const sandboxHint = /verify a domain|testing emails|only send.*own email/i.test(message)
        ? " This is Resend's sandbox restriction: onboarding@resend.dev only delivers to the account owner's address. Verify a domain and set RECEIPT_FROM_EMAIL to an address on it."
        : "";

      return {
        sent: false,
        error: `${payload?.name ? `${payload.name}: ` : ""}${message}${sandboxHint}`,
      };
    }

    console.info("[email] sent", { to: params.to, id: payload?.id });
    return { sent: true, id: payload?.id };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error("[email] request threw", { to: params.to, message });
    return { sent: false, error: message };
  }
}
