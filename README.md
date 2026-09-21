# Cosy Crest — Apartment Booking Platform

Next.js (App Router) + TypeScript + Tailwind v4 + Supabase, with Paystack payments.

---

## Getting started

> **First time here?** Follow **[SETUP.md](SETUP.md)** — a step-by-step guide to
> creating the Supabase project, running the schema, and getting Paystack keys.

```bash
npm install
cp .env.example .env.local   # then fill in the values below
npm run dev                  # http://localhost:3000
```

Until Supabase is configured the app falls back to the property catalogue
bundled in `app/lib/data.ts`, so the site is browsable but nothing persists.

### Required environment variables

| Variable | Scope | Purpose |
| --- | --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | public | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | public | Supabase anon key (browser reads) |
| `SUPABASE_SERVICE_ROLE_KEY` | **server only** | Webhook writes booking status, bypassing RLS |
| `NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY` | public | `pk_test_xxx` / `pk_live_xxx` |
| `PAYSTACK_SECRET_KEY` | **server only** | `sk_test_xxx` / `sk_live_xxx` — signs + verifies transactions |
| `RESEND_API_KEY` | **server only** | Receipt emails. Optional — without it no email is sent |
| `RECEIPT_FROM_EMAIL` | **server only** | `Cosy Crest <receipts@yourdomain.com>`, on a Resend-verified domain |
| `NEXT_PUBLIC_SITE_URL` | public | Absolute origin, used for Paystack `callback_url`, receipt links and OG tags |

> The app renders even when these are unset — Supabase calls degrade to empty
> states and the booking calendar falls back to the default date window. Payment
> cannot be taken until the Paystack secret key is present.

### Database

Run [`supabase/schema.sql`](supabase/schema.sql) in the Supabase SQL editor.
It is idempotent and bootstraps a project from empty:

- `villas` — the property catalogue, seeded with the three starter properties
- `bookings` — reservations plus the payment columns (`check_out_date`,
  `nights`, `currency`, `packages`, `payment_reference`, `payment_status`,
  `paid_at`, `amount_paid`)
- `blocked_dates` — admin-defined unavailable ranges per property
- an asset-path repair for rows seeded before the `/Lake1.jpg` casing fix
- RLS policies for all of them. Reads of `villas` and `blocked_dates` are
  public; everything else, including reads of `bookings`, requires an
  authenticated admin. An existing `invoices` table is locked down too if
  present — the app never reads it, but it holds the same guest PII.

### Admin access

`/admin` is protected by Supabase Auth. `middleware.ts` redirects any request
under `/admin` to `/admin/login` unless there is a valid session.

**You must create a user first** — while the users list is empty the login page
rejects everything. See [SETUP.md](SETUP.md) → *A4. Create your admin login*.

Note: with credentials absent the app runs in a bundled-catalogue demo mode and
the gate deliberately steps aside, since there is no database to protect.

### Paystack webhook

In **Paystack Dashboard → Settings → API Keys & Webhooks**, set the webhook URL to:

```
https://<your-domain>/api/payments/paystack/webhook
```

The endpoint accepts `charge.success` and flips the booking to **paid /
confirmed**. It is unauthenticated by design and instead verifies the
`x-paystack-signature` header (HMAC-SHA512 of the raw body with the secret key).

---

## Architecture

### Booking availability

| Module | Responsibility |
| --- | --- |
| [`app/lib/dates.ts`](app/lib/dates.ts) | Date engine: local-time `YYYY-MM-DD` keys, window boundaries, nights, range expansion, conflict detection, `validateStay` |
| [`app/lib/availability.ts`](app/lib/availability.ts) | `useVillaAvailability(villaId)` merges admin blockouts + existing bookings; fails soft |
| [`app/components/booking/DateRangePicker.tsx`](app/components/booking/DateRangePicker.tsx) | Availability-aware calendar that greys out unavailable nights |

**Booking window.** The window is a rolling "current year + next calendar year":

- In 2026, bookings are open through **31 Dec 2027**; 2028 is blocked.
- Once the calendar reaches 2027, **2028 opens automatically**.

The tuning point is `MID_YEAR_EXTENSION_MONTH` in `app/lib/dates.ts`.

**Conflict rule.** A stay occupies the half-open interval `[check-in, check-out)`.
The check-out day itself is free for the next guest's check-in, so a booking may
begin on the day another ends. Past dates, dates beyond the window, admin-blocked
dates, and already-booked nights are all disabled in the picker.

### Payments

| Endpoint | Method | Purpose |
| --- | --- | --- |
| `/api/payments/paystack/initialize` | POST | Validates the request, re-checks availability server-side, creates a `pending` booking, returns the Paystack checkout URL |
| `/api/payments/paystack/verify` | GET | Called by `/checkout/success`; confirms the transaction against Paystack so a delayed webhook cannot lose a sale |
| `/api/payments/paystack/webhook` | POST | Verifies the signature and marks the booking paid/confirmed on `charge.success` |

Amounts are converted to the currency subunit (pesewas/cents) with `toSubunit()`.
Card, mobile money, bank transfer and USSD channels are enabled.

---

## Admin

| Route | Purpose |
| --- | --- |
| `/admin` | Dashboard stats |
| `/admin/villas` | Add / delete properties |
| `/admin/availability` | Block or release date ranges per property |
| `/admin/bookings` | Review reservations, payment status, confirm/cancel |
| `/admin/invoice` | Build and print/share an invoice |
| `/admin/settings` | Change the admin password |

---

## Scripts

```bash
npm run dev     # development server
npm run build   # production build
npm run start   # serve the production build
npm run lint    # eslint
npx tsc --noEmit  # typecheck
```

---

## Deployment (Vercel)

1. Push the repo and import it into Vercel.
2. Add every variable from `.env.example` under **Project → Settings → Environment Variables**.
3. Deploy. Route Handlers run as serverless functions.

> **Note on `next.config.ts`:** this project previously used `output: "export"`
> (static HTML export). That was removed because a static export cannot host
> Route Handlers, which the Paystack endpoints require.
