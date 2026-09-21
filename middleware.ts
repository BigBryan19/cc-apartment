// middleware.ts
// ---------------------------------------------------------------------------
// Route protection for /admin.
//
// The admin panel reads guest reservations with the public anon key, so without
// a real session check anyone who opens /admin can read every guest's name,
// email and phone number. This gate runs before the page renders.
//
// `getUser()` is used rather than `getSession()` on purpose: getSession() only
// decodes the cookie locally and would trust a forged one, while getUser()
// revalidates the token against Supabase Auth.
// ---------------------------------------------------------------------------

import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

export async function middleware(request: NextRequest) {
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

  const { pathname } = request.nextUrl;
  const isLoginRoute = pathname === "/admin/login";

  // Not signed in, and not already on the login page → send to login.
  if (!user && !isLoginRoute) {
    const url = request.nextUrl.clone();
    url.pathname = "/admin/login";
    url.search = "";
    url.searchParams.set("next", pathname);
    return NextResponse.redirect(url);
  }

  // Already signed in → no reason to sit on the login page.
  if (user && isLoginRoute) {
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
