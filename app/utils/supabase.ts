// app/utils/supabase.ts
// ---------------------------------------------------------------------------
// Browser Supabase client.
//
// IMPORTANT: this factory is intentionally *safe to call when the environment
// is not configured*. The previous implementation used
// `process.env.NEXT_PUBLIC_SUPABASE_URL!` and was invoked at component-body
// level, so Next.js threw
//   "@supabase/ssr: Your project's URL and API key are required..."
// while prerendering /admin/bookings and the build failed.
//
// Now: a singleton is created lazily, and if the env vars are missing we return
// a client pointed at a placeholder origin. Queries then fail as ordinary
// network errors, which every caller already handles, instead of crashing the
// render. Components fall back to static data / empty states.
// ---------------------------------------------------------------------------

import { createBrowserClient } from "@supabase/ssr";
import type { SupabaseClient } from "@supabase/supabase-js";

/** Placeholder used only so client construction can never throw. */
const PLACEHOLDER_URL = "https://placeholder.supabase.co";
const PLACEHOLDER_KEY = "placeholder-anon-key";

let browserClient: SupabaseClient | null = null;

/** True when real Supabase credentials are present. */
export function isSupabaseConfigured(): boolean {
  return Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL &&
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  );
}

/**
 * Returns a memoised browser client.
 * Never throws — check {@link isSupabaseConfigured} if you need to branch.
 */
export function createClient(): SupabaseClient {
  if (browserClient) return browserClient;

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  browserClient = createBrowserClient(
    url && key ? url : PLACEHOLDER_URL,
    url && key ? key : PLACEHOLDER_KEY,
  );

  return browserClient;
}
