// app/lib/receipt.ts
// ---------------------------------------------------------------------------
// Receipt / invoice rendering.
//
// One renderer feeds both the confirmation email and the printable page the
// guest can download, so the two can never drift apart.
//
// The markup is deliberately old-fashioned — tables and inline styles — because
// email clients (Outlook especially) ignore stylesheets, flexbox and grid.
// ---------------------------------------------------------------------------

import "server-only";
import { createServiceClient, isServiceRoleConfigured } from "./supabase-server";
import { sendEmail } from "./email";

/**
 * The columns the receipt reads. Declared explicitly rather than inferred from
 * the select string: supabase-js parses the string as a TS literal type, and a
 * concatenated one silently collapses to `GenericStringError`.
 */
interface BookingRow {
  id: string;
  guest_name: string | null;
  guest_email: string | null;
  guest_phone: string | null;
  check_in_date: string | null;
  check_out_date: string | null;
  nights: number | null;
  total_amount: number | null;
  currency: string | null;
  amount_paid: number | null;
  paid_at: string | null;
  payment_status: string | null;
  payment_reference: string | null;
  created_at: string | null;
  villas: { title?: string | null; location?: string | null } | null;
}

export interface ReceiptData {
  /** Paystack reference — also used as the document number. */
  reference: string;
  issuedAt: string | null;
  paidAt: string | null;
  guestName: string;
  guestEmail: string;
  guestPhone: string;
  villaTitle: string;
  villaLocation: string;
  checkIn: string;
  checkOut: string | null;
  nights: number | null;
  currency: string;
  totalAmount: number;
  amountPaid: number;
  isPaid: boolean;
}

const ACCENT = "#455360";
const INK = "#222222";
const MUTED = "#717171";
const LINE = "#e4e4e4";

const CONTACT = {
  name: "Cosy Crest Apartments",
  address: "Adenta, Greater Accra, Ghana",
  phone: "+233 54 053 4870",
  email: "officialcosycrestaparts@gmail.com",
};

function money(amount: number, currency: string): string {
  const symbol = currency === "USD" ? "$" : "GH₵";
  return `${symbol} ${amount.toLocaleString("en-GB", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

function longDate(value: string | null): string {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

/** Escape for safe interpolation into HTML. */
function esc(value: string | number | null | undefined): string {
  return String(value ?? "").replace(
    /[&<>"']/g,
    (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        c
      ] as string,
  );
}

/**
 * Load everything the receipt needs for a Paystack reference.
 * Returns null when there is no matching booking.
 */
export async function loadReceiptData(
  reference: string,
): Promise<ReceiptData | null> {
  if (!isServiceRoleConfigured()) return null;

  const supabase = createServiceClient();
  const { data, error } = await supabase
    .from("bookings")
    .select(
      "id, guest_name, guest_email, guest_phone, check_in_date, check_out_date, nights, total_amount, currency, amount_paid, paid_at, payment_status, payment_reference, created_at, villas(title, location)",
    )
    .eq("payment_reference", reference)
    .maybeSingle();

  if (error || !data) return null;

  const row = data as unknown as BookingRow;

  return {
    reference: String(row.payment_reference ?? reference),
    issuedAt: row.created_at ?? null,
    paidAt: row.paid_at ?? null,
    guestName: String(row.guest_name ?? "Guest"),
    guestEmail: String(row.guest_email ?? ""),
    guestPhone: String(row.guest_phone ?? ""),
    villaTitle: row.villas?.title ?? "Cosy Crest Apartment",
    villaLocation: row.villas?.location ?? CONTACT.address,
    checkIn: String(row.check_in_date ?? ""),
    checkOut: row.check_out_date ?? null,
    nights: row.nights ?? null,
    currency: String(row.currency ?? "GHS"),
    totalAmount: Number(row.total_amount ?? 0),
    amountPaid:
      row.amount_paid !== null && row.amount_paid !== undefined
        ? Number(row.amount_paid)
        : Number(row.total_amount ?? 0),
    isPaid: String(row.payment_status ?? "") === "paid",
  };
}

/**
 * Render the receipt.
 *
 * @param options.forEmail  Absolute logo URL is required for email; the web
 *                          page can use a root-relative one.
 * @param options.siteUrl   Origin used to build absolute links/images.
 */
export function renderReceiptHtml(
  data: ReceiptData,
  options: { forEmail?: boolean; siteUrl?: string } = {},
): string {
  const siteUrl = (options.siteUrl ?? "").replace(/\/$/, "");
  const logoSrc = options.forEmail
    ? `${siteUrl}/cc-real.png`
    : "/cc-real.png";

  const documentTitle = data.isPaid ? "RECEIPT" : "INVOICE";
  const outstanding = Math.max(0, data.totalAmount - data.amountPaid);

  const row = (label: string, value: string, strong = false) => `
    <tr>
      <td style="padding:7px 0;color:${MUTED};font-size:14px;">${esc(label)}</td>
      <td style="padding:7px 0;text-align:right;color:${strong ? INK : MUTED};font-size:14px;${strong ? "font-weight:bold;" : ""}">${esc(value)}</td>
    </tr>`;

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>${esc(documentTitle)} ${esc(data.reference)} — Cosy Crest</title>
</head>
<body style="margin:0;padding:0;background:#f4f4f5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f4f4f5;padding:24px 12px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:680px;background:#ffffff;border:1px solid ${LINE};border-radius:12px;overflow:hidden;">

          <!-- Header -->
          <tr>
            <td style="padding:36px 40px 24px 40px;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td valign="top">
                    <div style="font-size:34px;font-weight:bold;color:#1f2937;letter-spacing:-0.5px;line-height:1;">${esc(documentTitle)}</div>
                    <div style="margin-top:8px;color:${MUTED};font-size:14px;font-weight:500;">#${esc(data.reference)}</div>
                  </td>
                  <td valign="top" align="right">
                    <img src="${esc(logoSrc)}" alt="Cosy Crest" width="96" style="display:block;width:96px;height:auto;">
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Meta -->
          <tr>
            <td style="padding:0 40px;">
              <!-- table-layout:fixed makes the 33% widths actually bind. Without
                   it the browser auto-sizes, and a long guest email widens its
                   column and spills outside the card. -->
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-top:1px solid ${LINE};border-bottom:1px solid ${LINE};table-layout:fixed;">
                <tr>
                  <td width="33%" valign="top" style="padding:20px 0;">
                    <div style="font-size:13px;font-weight:bold;color:#1f2937;margin-bottom:6px;">Issued</div>
                    <div style="font-size:13px;color:${MUTED};">${esc(longDate(data.issuedAt))}</div>
                    <div style="font-size:13px;font-weight:bold;color:#1f2937;margin:14px 0 6px 0;">${data.isPaid ? "Paid" : "Due"}</div>
                    <div style="font-size:13px;color:${MUTED};">${esc(data.isPaid ? longDate(data.paidAt) : "On receipt")}</div>
                  </td>
                  <td width="33%" valign="top" style="padding:20px 12px;">
                    <div style="font-size:13px;font-weight:bold;color:#1f2937;margin-bottom:6px;">Billed to</div>
                    <div style="font-size:13px;color:${MUTED};font-weight:500;">${esc(data.guestName)}</div>
                    ${data.guestPhone ? `<div style="font-size:13px;color:${MUTED};overflow-wrap:anywhere;">${esc(data.guestPhone)}</div>` : ""}
                    ${data.guestEmail ? `<div style="font-size:13px;color:${MUTED};word-break:break-all;overflow-wrap:anywhere;">${esc(data.guestEmail)}</div>` : ""}
                  </td>
                  <td width="33%" valign="top" style="padding:20px 0;">
                    <div style="font-size:13px;font-weight:bold;color:#1f2937;margin-bottom:6px;">From</div>
                    <div style="font-size:13px;color:${MUTED};font-weight:500;">${esc(CONTACT.name)}</div>
                    <div style="font-size:13px;color:${MUTED};">${esc(CONTACT.address)}</div>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Stay -->
          <tr>
            <td style="padding:28px 40px 8px 40px;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-bottom:1px solid ${LINE};padding-bottom:12px;">
                <tr>
                  <td style="font-size:13px;font-weight:bold;color:#1f2937;padding-bottom:10px;">Service</td>
                  <td align="center" style="font-size:13px;font-weight:bold;color:#1f2937;padding-bottom:10px;">Check-in</td>
                  <td align="center" style="font-size:13px;font-weight:bold;color:#1f2937;padding-bottom:10px;">Check-out</td>
                  <td align="right" style="font-size:13px;font-weight:bold;color:#1f2937;padding-bottom:10px;">Amount</td>
                </tr>
                <tr>
                  <td valign="top" style="font-size:14px;color:#1f2937;font-weight:500;padding-right:12px;">
                    ${esc(data.villaTitle)}
                    <div style="font-size:12px;color:#9ca3af;margin-top:4px;font-weight:400;">${esc(data.villaLocation)}</div>
                  </td>
                  <td align="center" valign="top" style="font-size:13px;color:${MUTED};white-space:nowrap;">${esc(longDate(data.checkIn))}</td>
                  <td align="center" valign="top" style="font-size:13px;color:${MUTED};white-space:nowrap;">${esc(longDate(data.checkOut))}</td>
                  <td align="right" valign="top" style="font-size:13px;color:${MUTED};white-space:nowrap;">${esc(money(data.totalAmount, data.currency))}</td>
                </tr>
                ${
                  data.nights
                    ? `<tr><td colspan="4" style="font-size:12px;color:#9ca3af;padding-top:8px;">${esc(data.nights)} ${data.nights === 1 ? "night" : "nights"}</td></tr>`
                    : ""
                }
              </table>
            </td>
          </tr>

          <!-- Totals -->
          <tr>
            <td style="padding:8px 40px 32px 40px;">
              <table role="presentation" align="right" cellpadding="0" cellspacing="0" style="width:280px;">
                ${row("Subtotal", money(data.totalAmount, data.currency))}
                ${data.isPaid ? row("Paid", money(data.amountPaid, data.currency)) : ""}
                <tr><td colspan="2" style="border-top:1px solid ${LINE};padding-top:4px;"></td></tr>
                ${row("Total", money(data.totalAmount, data.currency), true)}
                <tr>
                  <td style="padding:6px 0;font-size:14px;font-weight:bold;color:${ACCENT};">${data.isPaid ? "Balance" : "Amount due"}</td>
                  <td style="padding:6px 0;text-align:right;font-size:14px;font-weight:bold;color:${ACCENT};">${esc(money(outstanding, data.currency))}</td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding:0 40px 36px 40px;">
              <div style="font-size:14px;font-weight:bold;color:#1f2937;margin-bottom:18px;">
                ${data.isPaid ? "Thank you for your payment!" : "Thank you for the business!"}
              </div>
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-top:1px solid ${LINE};">
                <tr>
                  <td style="padding-top:16px;font-size:12px;color:${MUTED};">${esc(CONTACT.name)}</td>
                  <td align="center" style="padding-top:16px;font-size:12px;color:${MUTED};">${esc(CONTACT.phone)}</td>
                  <td align="right" style="padding-top:16px;font-size:12px;color:${MUTED};word-break:break-all;">${esc(CONTACT.email)}</td>
                </tr>
              </table>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

/** Plain-text fallback for clients that refuse HTML. */
export function renderReceiptText(data: ReceiptData): string {
  const lines = [
    `${data.isPaid ? "RECEIPT" : "INVOICE"} #${data.reference}`,
    "",
    `Guest:     ${data.guestName}`,
    `Property:  ${data.villaTitle}`,
    `Check-in:  ${longDate(data.checkIn)}`,
    `Check-out: ${longDate(data.checkOut)}`,
    data.nights ? `Nights:    ${data.nights}` : "",
    "",
    `Total:     ${money(data.totalAmount, data.currency)}`,
    data.isPaid ? `Paid:      ${money(data.amountPaid, data.currency)}` : "",
    `${data.isPaid ? "Balance" : "Amount due"}: ${money(
      Math.max(0, data.totalAmount - data.amountPaid),
      data.currency,
    )}`,
    "",
    CONTACT.name,
    `${CONTACT.phone} · ${CONTACT.email}`,
  ];
  return lines.filter(Boolean).join("\n");
}

export function receiptSubject(data: ReceiptData): string {
  return `${data.isPaid ? "Receipt" : "Invoice"} ${data.reference} — ${data.villaTitle}`;
}

/**
 * Email the guest their receipt, at most once.
 *
 * Both the Paystack webhook and the /verify route call this, because either can
 * be the first to learn that a payment succeeded: the guest always lands back
 * on /checkout/success (which calls /verify), while the webhook may be delayed
 * — or, until it is registered in the Paystack dashboard, never arrive at all.
 * `receipt_sent_at` makes whichever runs second a no-op, so the guest cannot be
 * sent two receipts.
 *
 * Returns a short status string, useful in webhook responses for diagnosing
 * delivery without digging through logs.
 */
export async function sendReceiptOnce(reference: string): Promise<string> {
  if (!isServiceRoleConfigured()) return "storage not configured";

  try {
    const supabase = createServiceClient();

    const { data, error } = await supabase
      .from("bookings")
      .select("id, receipt_sent_at, guest_email")
      .eq("payment_reference", reference)
      .maybeSingle();

    if (error) return `lookup failed: ${error.message}`;
    if (!data) return "no booking matched";

    const booking = data as unknown as {
      id: string;
      receipt_sent_at: string | null;
      guest_email: string | null;
    };

    if (booking.receipt_sent_at) return "already sent";
    if (!booking.guest_email) return "booking has no guest email";

    const receipt = await loadReceiptData(reference);
    if (!receipt) return "no booking matched";

    const siteUrl = (process.env.NEXT_PUBLIC_SITE_URL ?? "").replace(/\/$/, "");

    const result = await sendEmail({
      to: receipt.guestEmail,
      subject: receiptSubject(receipt),
      html: renderReceiptHtml(receipt, { forEmail: true, siteUrl }),
      text: renderReceiptText(receipt),
      replyTo: "officialcosycrestaparts@gmail.com",
    });

    if (!result.sent) return result.error ?? "not sent";

    // Stamp only after a successful send, so a transient failure can be
    // retried by the other caller rather than being recorded as delivered.
    await supabase
      .from("bookings")
      .update({ receipt_sent_at: new Date().toISOString() })
      .eq("id", booking.id);

    return "sent";
  } catch (error) {
    return error instanceof Error ? error.message : "unknown error";
  }
}
