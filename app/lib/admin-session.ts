// app/lib/admin-session.ts
// ---------------------------------------------------------------------------
// The staff session, for route handlers.
//
// Reads the Supabase auth cookies the browser already holds and revalidates the
// token through `getUser()`. `getSession()` would only decode the cookie locally
// and would trust a forged one — the same reasoning as the middleware.
//
// The client this returns is scoped to the staff user, so every write it makes
// still passes through Row Level Security. That is on purpose: this module must
// never become a quiet route around the policies.
// ---------------------------------------------------------------------------

import "server-only";
import { createServerClient } from "@supabase/ssr";
import type { SupabaseClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";
import { isAdministrator } from "./admin-access";

export type AdminSession =
  | { ok: true; supabase: SupabaseClient; email: string | null }
  | { ok: false; status: 401 | 403 | 503; error: string };

export async function getAdminSession(): Promise<AdminSession> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !key) {
    return {
      ok: false,
      status: 503,
      error: "Supabase is not configured on the server.",
    };
  }

  const store = await cookies();

  const supabase = createServerClient(url, key, {
    cookies: {
      getAll: () => store.getAll(),
      setAll: (cookiesToSet) => {
        // A route handler may refresh the session cookie. Failing to write it is
        // not worth failing the request over — the token still validated.
        try {
          for (const { name, value, options } of cookiesToSet) {
            store.set(name, value, options);
          }
        } catch {
          /* read-only cookie store */
        }
      },
    },
  });

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { ok: false, status: 401, error: "Sign in to do that." };
  }

  if (!isAdministrator(user)) {
    return {
      ok: false,
      status: 403,
      error: "This account is not an administrator.",
    };
  }

  return { ok: true, supabase, email: user.email ?? null };
}
