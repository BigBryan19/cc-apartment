// app/lib/sms.ts
// ---------------------------------------------------------------------------
// Transactional SMS, through Arkesel (https://developers.arkesel.com).
//
//   POST https://sms.arkesel.com/api/v2/sms/send
//   api-key: <ARKESEL_API_KEY>
//   { "sender": "...", "message": "...", "recipients": ["+233241234567"] }
//
// Soft-failing by design, exactly like app/lib/email.ts: a guest whose
// verification succeeded must not be un-verified because the SMS gateway was
// down or the credit ran out. The caller decides what to tell staff.
//
// Numbers are stored the way guests type them — "024 123 4567" — and Arkesel
// wants MSISDN, so {@link toMsisdn} does that conversion in one place.
// ---------------------------------------------------------------------------

import "server-only";

const ARKESEL_ENDPOINT = "https://sms.arkesel.com/api/v2/sms/send";

export interface SmsResult {
  sent: boolean;
  id?: string;
  error?: string;
  /** The number actually dialled, after normalisation. Handy in the response. */
  to?: string;
}

export function isSmsConfigured(): boolean {
  return Boolean(process.env.ARKESEL_API_KEY && process.env.ARKESEL_SENDER_ID);
}

/**
 * Convert a typed phone number to MSISDN.
 *
 * Ghanaian mobile numbers are ten digits starting with zero (024 123 4567), or
 * nine digits when the leading zero is dropped, or already international with
 * 233. Anything that cannot be resolved to something dialable returns null
 * rather than letting the gateway guess.
 */
export function toMsisdn(raw: string | null | undefined): string | null {
  if (!raw) return null;

  const digits = raw.replace(/\D/g, "");
  if (!digits) return null;

  // "00" is how a lot of people write an international prefix — 00233… must not
  // become +00233…
  const national = digits.startsWith("00") ? digits.slice(2) : digits;

  if (national.startsWith("233") && national.length === 12) return `+${national}`;
  if (national.startsWith("0") && national.length === 10) return `+233${national.slice(1)}`;
  if (national.length === 9) return `+233${national}`;
  if (national.length >= 11 && national.length <= 15) return `+${national}`;

  return null;
}

/** The wording the property approved, kept here so both callers agree. */
export function verificationSms(name: string): string {
  const guest = name.trim() || "there";
  return `Hi ${guest}, your check-in registration for Cosy Crest is verified! Your smart lock access code will be sent to you on your day of arrival.`;
}

export async function sendSms({
  to,
  message,
}: {
  to: string | null | undefined;
  message: string;
}): Promise<SmsResult> {
  const apiKey = process.env.ARKESEL_API_KEY;
  const sender = process.env.ARKESEL_SENDER_ID;

  if (!apiKey || !sender) {
    console.info("[sms] ARKESEL_API_KEY or ARKESEL_SENDER_ID is not set — skipping send.");
    return { sent: false, error: "SMS is not configured." };
  }

  const msisdn = toMsisdn(to);
  if (!msisdn) {
    return {
      sent: false,
      error: "The guest's phone number is not a usable mobile number.",
    };
  }

  try {
    const response = await fetch(ARKESEL_ENDPOINT, {
      method: "POST",
      headers: {
        "api-key": apiKey,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        sender,
        message,
        recipients: [msisdn],
      }),
      signal: AbortSignal.timeout(8000),
    });

    const raw = await response.text();
    let payload: unknown = null;
    try {
      payload = JSON.parse(raw);
    } catch {
      /* gateway answered with something that is not JSON */
    }

    const status =
      payload && typeof payload === "object" && "status" in payload
        ? String((payload as { status?: unknown }).status)
        : null;

    const id =
      payload && typeof payload === "object" && "data" in payload
        ? ((payload as { data?: { id?: string } }).data?.id ?? undefined)
        : undefined;

    if (response.ok && (status === null || status === "success")) {
      return { sent: true, id, to: msisdn };
    }

    // Prefer the gateway's own wording ("Invalid sender id") over its status
    // word, which is just "error".
    const gatewayMessage =
      payload && typeof payload === "object" && "message" in payload
        ? String((payload as { message?: unknown }).message ?? "")
        : "";
    const detail = gatewayMessage || status || `HTTP ${response.status}`;

    return { sent: false, to: msisdn, error: `Arkesel refused the message: ${detail}` };
  } catch (error) {
    const message = error instanceof Error ? error.message : "network error";
    return { sent: false, to: msisdn, error: `Could not reach Arkesel: ${message}` };
  }
}
