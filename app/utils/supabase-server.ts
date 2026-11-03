// app/utils/supabase-server.ts
// ---------------------------------------------------------------------------
// Read-only Supabase client for server components (layout, pages).
//
// Uses the public anon key: everything read through it is public content —
// properties, gallery rows, site settings. Nothing here needs the service role,
// and using it on the server would risk leaking it into a render path.
//
// Returns null when the environment is not configured, so a missing .env
// degrades to defaults instead of throwing during a build.
// ---------------------------------------------------------------------------

import { createClient, type SupabaseClient } from "@supabase/supabase-js";

let serverClient: SupabaseClient | null = null;

export function createServerClient(): SupabaseClient | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) return null;

  if (!serverClient) {
    serverClient = createClient(url, key, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
  }
  return serverClient;
}
