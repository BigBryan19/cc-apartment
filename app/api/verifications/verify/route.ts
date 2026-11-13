// app/api/verifications/verify/route.ts
// ---------------------------------------------------------------------------
// Mark a registration verified, then text the guest.
//
// WHY THIS IS AN ENDPOINT AND NOT A BROWSER UPDATE
//
//   The status change is a one-line Supabase update that the queue could have
//   made itself — it already updates rejected records that way. It lives here
//   for the SMS: ARKESEL_API_KEY and ARKESEL_SENDER_ID are server secrets and
//   must never reach a browser bundle.
//
// ORDER OF OPERATIONS, AND WHY
//
//   1. Authorise. No session, or a session that is not on ADMIN_EMAILS and has
//      no app_metadata.role = "admin", gets nothing.
//   2. Write the status. This is the thing staff asked for, so it goes first.
//   3. Text the guest, in a try/catch, after the write has already succeeded.
//
//   If the gateway is down the response still says verified — because it is.
//   The SMS outcome travels back separately so the queue can say "verified, but
//   no text went out" instead of pretending either that everything worked or
//   that the verification failed.
// ---------------------------------------------------------------------------

import { NextResponse } from "next/server";
import { getAdminSession } from "../../../lib/admin-session";
import { sendSms, verificationSms } from "../../../lib/sms";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const session = await getAdminSession();
  if (!session.ok) {
    return NextResponse.json(
      { ok: false, error: session.error },
      { status: session.status },
    );
  }

  const body = (await request.json().catch(() => null)) as { id?: unknown } | null;
  const id = typeof body?.id === "string" ? body.id : "";
  if (!id) {
    return NextResponse.json({ ok: false, error: "No registration id was sent." }, { status: 400 });
  }

  // Read first: the SMS needs the name and number, and it also proves the row is
  // visible to this session before anything is written.
  const { data: row, error: readError } = await session.supabase
    .from("guest_verifications")
    .select("id, full_name, contact_number, whatsapp_number")
    .eq("id", id)
    .maybeSingle();

  if (readError) {
    return NextResponse.json({ ok: false, error: readError.message }, { status: 500 });
  }
  if (!row) {
    return NextResponse.json(
      { ok: false, error: "That registration no longer exists." },
      { status: 404 },
    );
  }

  const { error: updateError } = await session.supabase
    .from("guest_verifications")
    .update({
      status: "verified",
      reviewed_at: new Date().toISOString(),
      rejection_reason: null,
    })
    .eq("id", id);

  if (updateError) {
    console.error("[verify] the status update was refused", { id, message: updateError.message });
    // The most likely cause is the `rejected` status or `reviewed_at` column not
    // existing yet, which the SQL runbook adds.
    const hint = /check constraint|column .* does not exist/i.test(updateError.message)
      ? " The database is missing the review columns — run supabase/RUN-THIS-IN-SUPABASE.sql."
      : "";
    return NextResponse.json(
      { ok: false, error: `${updateError.message}.${hint}` },
      { status: 500 },
    );
  }

  const guest = (row.full_name as string | null) ?? "";
  const to = (row.whatsapp_number as string | null) ?? (row.contact_number as string | null);

  let sms;
  try {
    sms = await sendSms({ to, message: verificationSms(guest) });
  } catch (error) {
    console.error("[verify] SMS threw", { id, message: error instanceof Error ? error.message : String(error) });
    sms = {
      sent: false,
      error: error instanceof Error ? error.message : "SMS could not be sent.",
    };
  }

  if (!sms.sent) {
    // The verification stands; only the text failed. Logged so a failure in
    // production is diagnosable without asking the guest whether it arrived.
    console.warn("[verify] verified, SMS not sent", { id, error: sms.error });
  }

  return NextResponse.json({ ok: true, sms, reviewedAt: new Date().toISOString() });
}
