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
  const apiKey = process.env.RESEND_API_KEY;

  if (!apiKey) {
    // Not an error — the booking is still valid, the guest just does not get
    // an email until the key is added.
    console.info(
      "[email] RESEND_API_KEY is not set — skipping send to",
      params.to,
    );
    return { sent: false, error: "Email is not configured." };
  }

  if (!params.to.includes("@")) {
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

    const payload = (await response.json().catch(() => null)) as
      | { id?: string; message?: string }
      | null;

    if (!response.ok) {
      const message = payload?.message ?? `HTTP ${response.status}`;
      console.warn("[email] send failed:", message);
      return { sent: false, error: message };
    }

    return { sent: true, id: payload?.id };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.warn("[email] send threw:", message);
    return { sent: false, error: message };
  }
}
