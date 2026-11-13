// app/api/verify/notify/route.ts
// ---------------------------------------------------------------------------
// "A guest just registered" — email the office.
//
// CALLED BY /verify, FROM THE BROWSER, AFTER A SUCCESSFUL SUBMIT.
//
//   That makes this a public endpoint, so it trusts nothing in the request body
//   except a session id. The record is re-read from the database through the
//   service role; the name, stay and guests in the email come from the row, not
//   from the caller. Otherwise anyone could post whatever they liked to the
//   office inbox — a free relay with your address on it.
//
// WHY THE SERVICE ROLE
//
//   The guest is anonymous, and the staff read policy is authenticated-only, so
//   a public endpoint cannot see the row it is describing. The payload sent is
//   only an id; nothing is returned to the caller beyond a boolean, so this does
//   not leak the record back out.
//
// FAILURE POLICY
//
//   Everything soft-fails with 200. A guest who successfully registered must get
//   their thank-you screen whether or not Resend is reachable, configured, or in
//   the mood. The response says what happened, for the logs.
// ---------------------------------------------------------------------------

import { NextResponse } from "next/server";
import { createServiceClient, isServiceRoleConfigured } from "../../../lib/supabase-server";
import { isEmailConfigured, sendEmail } from "../../../lib/email";

export const dynamic = "force-dynamic";

const FALLBACK_OFFICE = "officialcosycrestaparts@gmail.com";

interface Row {
  id: string;
  full_name: string | null;
  contact_number: string | null;
  whatsapp_number: string | null;
  email: string | null;
  id_type: string | null;
  check_in_date: string | null;
  check_out_date: string | null;
  guests_count: number | null;
  emergency_name: string | null;
  emergency_phone: string | null;
  status: string;
}

function officeAddress(): string {
  return process.env.VERIFY_ALERT_EMAIL?.trim() || FALLBACK_OFFICE;
}

function siteBase(request: Request): string {
  const configured = process.env.NEXT_PUBLIC_SITE_URL?.trim().replace(/\/$/, "");
  if (configured) return configured;
  try {
    return new URL(request.url).origin;
  } catch {
    return "";
  }
}

function prettyDate(iso: string | null): string {
  if (!iso) return "—";
  const date = new Date(`${iso}T00:00:00`);
  if (Number.isNaN(date.getTime())) return iso;
  return new Intl.DateTimeFormat("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(date);
}

export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as { sessionId?: unknown } | null;
  const sessionId = typeof body?.sessionId === "string" ? body.sessionId.trim() : "";

  if (!sessionId || sessionId.length > 64) {
    return NextResponse.json({ sent: false, error: "No session id was sent." }, { status: 400 });
  }

  if (!isServiceRoleConfigured()) {
    console.error("[notify] SUPABASE_SERVICE_ROLE_KEY is missing; the row cannot be read", {
      sessionId,
    });
    return NextResponse.json({
      sent: false,
      error: "SUPABASE_SERVICE_ROLE_KEY is not set, so the registration cannot be read.",
    });
  }

  if (!isEmailConfigured()) {
    console.error(
      "[notify] RESEND_API_KEY is empty in this deployment — the office alert cannot be sent.",
      { sessionId, office: officeAddress() },
    );
    return NextResponse.json({ sent: false, error: "RESEND_API_KEY is not set." });
  }

  try {
    const supabase = createServiceClient();

    const { data, error } = await supabase
      .from("guest_verifications")
      .select(
        "id, full_name, contact_number, whatsapp_number, email, id_type, check_in_date, check_out_date, guests_count, emergency_name, emergency_phone, status",
      )
      .eq("session_id", sessionId)
      .maybeSingle();

    if (error) {
      console.error("[notify] reading the registration failed", {
        sessionId,
        message: error.message,
        code: error.code,
      });
      return NextResponse.json({ sent: false, error: error.message });
    }

    const row = data as Row | null;
    if (!row) {
      console.error("[notify] no registration matched", { sessionId });
      return NextResponse.json({ sent: false, error: "No registration matched that session." });
    }

    // Drafts are autosaved continuously; only a real submit is worth an email.
    if (row.status !== "submitted") {
      // The usual cause: the insert itself failed, so the row is still a draft.
      console.warn("[notify] registration is not submitted — no alert sent", {
        sessionId,
        status: row.status,
      });
      return NextResponse.json({
        sent: false,
        error: `Registration is ${row.status}, not submitted.`,
      });
    }

    const name = row.full_name?.trim() || "A guest";
    const stay = `${prettyDate(row.check_in_date)} → ${prettyDate(row.check_out_date)}`;
    const link = `${siteBase(request)}/admin/verifications?open=${row.id}`;

    const lines = [
      `Guest: ${name}`,
      `Phone: ${row.contact_number ?? "—"}`,
      `WhatsApp: ${row.whatsapp_number ?? "—"}`,
      `Email: ${row.email ?? "—"}`,
      `Document: ${row.id_type ?? "—"}`,
      `Stay: ${stay}`,
      `Guests: ${row.guests_count ?? "—"}`,
      `Emergency contact: ${row.emergency_name ?? "—"} ${row.emergency_phone ?? ""}`.trim(),
      "",
      `Review it: ${link}`,
    ];

    const html = `
      <div style="font-family:-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;color:#1e242b;line-height:1.55">
        <h2 style="margin:0 0 4px;font-size:18px">New guest registration</h2>
        <p style="margin:0 0 16px;color:#6b7280;font-size:13px">
          ${name} has completed the pre check-in form. Nobody has reviewed it yet.
        </p>
        <table style="border-collapse:collapse;font-size:13px">
          <tr><td style="padding:4px 16px 4px 0;color:#6b7280">Guest</td><td><strong>${name}</strong></td></tr>
          <tr><td style="padding:4px 16px 4px 0;color:#6b7280">Phone</td><td>${row.contact_number ?? "—"}</td></tr>
          <tr><td style="padding:4px 16px 4px 0;color:#6b7280">WhatsApp</td><td>${row.whatsapp_number ?? "—"}</td></tr>
          <tr><td style="padding:4px 16px 4px 0;color:#6b7280">Email</td><td>${row.email ?? "—"}</td></tr>
          <tr><td style="padding:4px 16px 4px 0;color:#6b7280">Document</td><td>${row.id_type ?? "—"}</td></tr>
          <tr><td style="padding:4px 16px 4px 0;color:#6b7280">Stay</td><td>${stay}</td></tr>
          <tr><td style="padding:4px 16px 4px 0;color:#6b7280">Guests</td><td>${row.guests_count ?? "—"}</td></tr>
          <tr><td style="padding:4px 16px 4px 0;color:#6b7280">Emergency</td><td>${
            row.emergency_name ? `${row.emergency_name} · ${row.emergency_phone ?? "no number"}` : "—"
          }</td></tr>
        </table>
        <p style="margin:20px 0 0">
          <a href="${link}" style="display:inline-block;background:#455360;color:#fff;text-decoration:none;padding:10px 18px;border-radius:8px;font-size:13px;font-weight:600">
            Open in the queue
          </a>
        </p>
        <p style="margin:16px 0 0;color:#9ca3af;font-size:11px">
          The ID photograph is not attached to this email. Open the record to view it.
        </p>
      </div>`;

    const office = officeAddress();
    console.info("[notify] sending office alert", { sessionId, id: row.id, office });

    const result = await sendEmail({
      to: office,
      subject: `New guest registration — ${name}, ${stay}`,
      html,
      text: lines.join("\n"),
    });

    if (!result.sent) {
      console.error("[notify] the office alert was not sent", {
        sessionId,
        office,
        error: result.error,
      });
    }

    return NextResponse.json({ sent: result.sent, error: result.error, id: result.id, office });
  } catch (error) {
    console.error("[notify] unexpected failure", {
      sessionId,
      message: error instanceof Error ? error.message : String(error),
    });
    return NextResponse.json({
      sent: false,
      error: error instanceof Error ? error.message : "Unexpected failure.",
    });
  }
}
