// app/lib/supabase-server.ts
// ---------------------------------------------------------------------------
// Server-only Supabase client.
//
// Used by the Paystack webhook so it can update booking status without an
// authenticated admin session (bypasses Row Level Security via the
// service_role key).
//
// `server-only` guarantees this module is never bundled into client code.
// ---------------------------------------------------------------------------

import "server-only";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

let serviceClient: SupabaseClient | null = null;

export function isServiceRoleConfigured(): boolean {
  return Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL &&
      process.env.SUPABASE_SERVICE_ROLE_KEY,
  );
}

/**
 * Service-role client. Throws if credentials are absent — callers must check
 * {@link isServiceRoleConfigured} first and return a graceful error instead.
 */
export function createServiceClient(): SupabaseClient {
  if (serviceClient) return serviceClient;

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceKey) {
    throw new Error(
      "Supabase service client is not configured. Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.",
    );
  }

  serviceClient = createClient(url, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  return serviceClient;
}
