// app/lib/tables.ts
// ---------------------------------------------------------------------------
// Table names shared by client and server code.
//
// WHY THIS FILE EXISTS SEPARATELY
//   `BLOCKED_DATES_TABLE` used to live in app/lib/availability.ts, which is
//   marked `"use client"`. That module is imported by BOTH the browser hook and
//   the server route handlers — and a value imported from a `"use client"`
//   module into server code does not arrive as the value. Next.js replaces it
//   with a *client reference* (a module proxy), so in a route handler
//   `BLOCKED_DATES_TABLE` was an opaque object rather than the string
//   "blocked_dates".
//
//   The effect was silent: `supabase.from(<clientReference>)` throws
//   "Invalid relation name: relation must be a non-empty string.", and both
//   /api/payments/paystack/initialize and /api/bookings/request wrap their
//   availability check in a try/catch that deliberately does not fail the
//   request. So the check threw on every call and was swallowed — meaning the
//   server-side double-booking guard, the thing the code comments describe as
//   "defence in depth", had never run once in production.
//
//   This module has no directive, so it is safe to import from either side.
// ---------------------------------------------------------------------------

/** Admin-blocked date ranges. Public read, authenticated write. */
export const BLOCKED_DATES_TABLE = "blocked_dates";

/** Properties catalogue. Public read, authenticated write. */
export const VILLAS_TABLE = "villas";

/** Guest reservations, including contact details. Authenticated read only. */
export const BOOKINGS_TABLE = "bookings";
