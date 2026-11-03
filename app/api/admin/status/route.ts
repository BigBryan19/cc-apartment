// app/api/admin/status/route.ts
// ---------------------------------------------------------------------------
// Why this endpoint exists
//
//   The /admin gate fails closed: it only admits an account listed in
//   ADMIN_EMAILS, or one whose Supabase app_metadata says role = "admin". When
//   neither is configured, a correct password still bounces back to the login
//   page, which looks exactly like a wrong password. The owner hit precisely
//   that on 3 November 2026 — the Vercel project had no ADMIN_EMAILS at all.
//
//   This reports whether an administrator is configured, so the login page can
//   say so instead of looping silently. It exposes two booleans and nothing
//   else: no addresses, no counts, no secrets.
// ---------------------------------------------------------------------------

import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

function adminEmailCount(): number {
  return (process.env.ADMIN_EMAILS ?? "")
    .split(",")
    .map((entry) => entry.trim())
    .filter(Boolean).length;
}

export async function GET() {
  return NextResponse.json(
    {
      supabaseConfigured: Boolean(
        process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
      ),
      // The gate accepts either mechanism; this only reports the allowlist,
      // because app_metadata lives in Supabase and cannot be read from here
      // without a privileged call.
      adminAllowlistConfigured: adminEmailCount() > 0,
    },
    { headers: { "cache-control": "no-store" } },
  );
}
