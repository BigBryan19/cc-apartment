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

### What happens after a payment succeeds

Both the Paystack webhook and `/api/payments/paystack/verify` run the same
idempotent steps, because either can be the first to learn a charge succeeded —
the guest always returns through `/checkout/success`, while the webhook may lag
or, until it is registered in Paystack, never arrive.

1. The booking flips to `confirmed` / `paid`.
2. Its nights are written to `blocked_dates` as a **Reserved** hold, so they can
   be seen and released from `/admin/availability`. Guests were already kept off
   those nights by the booking itself; the hold exists to make it visible.
3. A receipt is emailed once (`receipt_sent_at` guards against a second copy).

Releasing a **Reserved** hold also cancels the booking — deleting the block
alone would not free the dates, because the reservation marks them unavailable
on its own. Refunds must be issued separately in Paystack.

The guest can download the same receipt any time at
`/receipt/<paystack-reference>`; the reference is the access token, which is why
it carries 64 bits of randomness.

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

## SEO

`NEXT_PUBLIC_SITE_URL` is not cosmetic — it is the origin used for canonical
URLs, Open Graph images, `robots.txt` and `sitemap.xml`. If it is wrong or
unset, every canonical and every preview image points at the wrong host, and
that actively suppresses ranking. **Set it to the real public domain.**

| Concern | Where | Notes |
| --- | --- | --- |
| Brand identity, address, geo, amenities | `app/lib/seo.ts` | One source of truth, also used by the receipt |
| Site-wide metadata, title template | `app/layout.tsx` | Default title + `%s \| Cosy Crest` for subpages |
| Per-property metadata + canonical | `app/villas/[id]/page.tsx` | Each apartment gets its own title, description and images |
| `robots.txt` | `app/robots.ts` | Blocks `/admin`, `/api`, `/receipt`, `/checkout` |
| `sitemap.xml` | `app/sitemap.ts` | Homepage + each property, with image entries |
| FAQ rich results | `app/lib/content.ts` | Shared by the FAQ section so copy and markup agree |

Structured data emitted: `LodgingBusiness`, `WebSite`, `Apartment` (with
`Offer` price), `BreadcrumbList`, `FAQPage`.

**Deliberately omitted:** `aggregateRating`. The 4.9 shown on the cards is a
hardcoded string, not a collected rating. Publishing invented review data
breaches Google's guidelines and risks a manual action — worse than no stars.
Add it once real reviews exist.

**Worth doing next:** submit the sitemap in Google Search Console and Bing
Webmaster Tools, and claim a Google Business Profile. Those two do more for
local discovery than any tag.

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
