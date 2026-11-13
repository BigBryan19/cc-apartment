// app/lib/admin-access.ts
// ---------------------------------------------------------------------------
// "Is this session an administrator?" — one rule, two callers.
//
//   The middleware uses it to decide whether /admin opens at all; the API routes
//   use it to decide whether a request may change a record. Keeping the rule in
//   one place matters: if the gate and the endpoints disagreed, an endpoint
//   would be the weaker door and the middleware's care would be pointless.
//
// Deliberately free of `next/headers`, `server-only` and any Supabase import, so
// the Edge middleware and a Node route handler can both use it.
// ---------------------------------------------------------------------------

/** Emails allowed into the panel, lower-cased. Empty when unset. */
export function adminEmails(): string[] {
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
export function isAdministrator(user: {
  email?: string | null;
  app_metadata?: Record<string, unknown>;
}): boolean {
  if (user.app_metadata?.role === "admin") return true;

  const email = user.email?.trim().toLowerCase();
  if (!email) return false;

  return adminEmails().includes(email);
}
