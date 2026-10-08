// middleware.ts
// ---------------------------------------------------------------------------
// Route protection for /admin.
//
// WHY "SIGNED IN" IS NOT ENOUGH
//   This gate used to check only that a Supabase session existed:
//
//     const { data: { user } } = await supabase.auth.getUser();
//     if (!user && !isLoginRoute) { /* redirect to login */ }
//
//   That is not an authorisation check. Every policy in supabase/schema.sql
//   grants the `authenticated` role unconditional access — `using (true)` on
//   `bookings` (guest names, emails, phone numbers), `villas`, `blocked_dates`
//   and `invoices`. So anyone who could obtain *a* session had full admin
//   rights. Public email signup was enabled on the Supabase project
//   (`disable_signup: false`), which made getting one trivial:
//
//     POST /auth/v1/signup  →  confirm email  →  sign in  →  read all guest PII
//
//   The gate now requires an explicitly designated administrator. Two ways to
//   be one, both checked here:
//
//     1. ADMIN_EMAILS — a comma-separated allowlist in the environment.
//     2. app_metadata.role === "admin" — set in Supabase Auth. Server-owned, so
//        a user cannot promote themselves by editing their own profile.
//
//   Set at least one, or nobody can reach /admin. That is deliberate: failing
//   closed is the correct failure mode for a panel that exposes guest contact
//   details and lets prices be edited. See SETUP.md.
//
// `getUser()` is used rather than `getSession()` on purpose: getSession() only
// decodes the cookie locally and would trust a forged one, while getUser()
// revalidates the token against Supabase Auth.
// ---------------------------------------------------------------------------

import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

/** Emails allowed into /admin, lower-cased. Empty when unset. */
function adminEmails(): string[] {
  return (process.env.ADMIN_EMAILS ?? "")
    .split(",")
    .map((entry) => entry.trim().toLowerCase())
    .filter(Boolean);
}

/**
 * A signed-in user is an administrator only if the session says so.
 *
 * `app_metadata` is the Supabase-owned half of the user record — it is stripped
 * from anything a client can write via `updateUser({ data })`, which writes to
 * `user_metadata` instead. That distinction is why the role lives there.
 */
function isAdministrator(user: {
  email?: string | null;
  app_metadata?: Record<string, unknown>;
}): boolean {
  if (user.app_metadata?.role === "admin") return true;

  const email = user.email?.toLowerCase();
  return Boolean(email && adminEmails().includes(email));
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const isLoginRoute = pathname === "/admin/login";

  // No credentials means no database, so there is nothing to protect. Leaving
  // /admin open keeps the bundled-catalogue demo mode usable.
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    return NextResponse.next();
  }

  let response = NextResponse.next({ request });

  const supabase = createServerClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    cookies: {
      getAll: () => request.cookies.getAll(),
      setAll: (cookiesToSet) => {
        cookiesToSet.forEach(({ name, value }) =>
          request.cookies.set(name, value),
        );
        response = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) =>
          response.cookies.set(name, value, options),
        );
      },
    },
  });

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const isAdmin = user ? isAdministrator(user) : false;

  // Signed in but not an administrator: the session is valid, the person is not
  // an admin. Send them to the login page with a reason rather than looping them
  // through a redirect they can never satisfy.
  if (user && !isAdmin) {
    console.warn(
      `[middleware] rejected non-admin session for ${user.email ?? user.id} on ${pathname}`,
    );

    const url = request.nextUrl.clone();
    url.pathname = "/admin/login";
    url.search = "";
    url.searchParams.set("error", "not_admin");

    // Do not bounce a rejected user off the login page itself, or the redirect
    // loops forever.
    if (isLoginRoute) {
      // Render the login page so the reason can be shown.
      return response;
    }

    return NextResponse.redirect(url);
  }

  // Not signed in, and not already on the login page → send to login.
  if (!user && !isLoginRoute) {
    const url = request.nextUrl.clone();
    url.pathname = "/admin/login";
    url.search = "";
    url.searchParams.set("next", pathname);
    return NextResponse.redirect(url);
  }

  // Already signed in as an admin → no reason to sit on the login page.
  if (isAdmin && isLoginRoute) {
    const url = request.nextUrl.clone();
    url.pathname = "/admin";
    url.search = "";
    return NextResponse.redirect(url);
  }

  return response;
}

export const config = {
  // Everything under /admin. `/admin/:path*` also matches bare `/admin`.
  matcher: ["/admin/:path*"],
};
