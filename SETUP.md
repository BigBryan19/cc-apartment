# Connecting Supabase and Paystack

A first-time walkthrough. Budget about 20 minutes.

You need two free accounts: [supabase.com](https://supabase.com) (database) and
[paystack.com](https://paystack.com) (payments). Neither requires you to enter
card details to start.

---

## What you are wiring up

| Value | Comes from | Goes into |
| --- | --- | --- |
| Project URL | Supabase | `NEXT_PUBLIC_SUPABASE_URL` |
| anon / publishable key | Supabase | `NEXT_PUBLIC_SUPABASE_ANON_KEY` |
| service_role / secret key | Supabase | `SUPABASE_SERVICE_ROLE_KEY` |
| Public key | Paystack | `NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY` |
| Secret key | Paystack | `PAYSTACK_SECRET_KEY` |
| Your site's URL | you | `NEXT_PUBLIC_SITE_URL` |

The `NEXT_PUBLIC_` prefix means the value is visible in the browser. The other
three must never be exposed — they stay server-side.

---

## Part A — Supabase

> **Already have a Supabase project?** Skip to **A2** to copy your keys, then run
> [`supabase/check.sql`](supabase/check.sql) before `schema.sql`. It is
> read-only and reports which tables already exist, what columns they have,
> and whether your `villas.id` is numeric or a uuid — which decides whether
> `schema.sql` is a clean install or an upgrade.

### A1. Create the project

1. Sign in and click **New project**.
2. Pick an organisation, give it a name (e.g. `cosy-crest`), and set a database
   password. **Save that password** somewhere safe.
3. Choose the region closest to your guests (for Ghana, a European region such
   as `eu-west` will be fastest).
4. Wait ~2 minutes while it provisions.

### A2. Copy the three values

In the dashboard go to **Settings → API Keys** (on older projects this is
**Settings → API**). You need:

- **Project URL** — looks like `https://abcdefgh.supabase.co`
- **anon** / **publishable** key — the public one
- **service_role** / **secret** key — click reveal, then copy

> Supabase is migrating key names. If your project shows `anon` and
> `service_role`, use those. If it shows a newer *publishable* / *secret* pair,
> use those instead. The names in this codebase are just slots — what matters is
> that the **public** key goes in the `ANON_KEY` variable and the **secret** one
> goes in the `SERVICE_ROLE_KEY` variable.

### A3. Create or upgrade the tables

1. In the sidebar click **SQL Editor** → **New query**.
2. Open [`supabase/schema.sql`](supabase/schema.sql) from this repo, copy the
   whole file, paste it in, and press **Run**.
3. It should report success.

The script is written to be safe on an existing project:

- it creates `villas`, `bookings` and `blocked_dates` if they are missing, and
  adds any missing columns if they already exist;
- the starter data only inserts when `villas` is **completely empty**, so it
  can never overwrite or collide with properties you already have.

Confirm it worked: **Table Editor** should list `villas`, `bookings` and
`blocked_dates`.

**One caveat worth checking.** The app links to properties as `/villas/<id>`
and the detail page resolves them from the bundled catalogue by **numeric** id
(1, 2, 3). If your existing `villas.id` is a **uuid**, the listing will render
but clicking through will report "Villa not found". `check.sql` reports the
column type — if it is a uuid, tell me and I'll rework the detail page to read
from Supabase instead.

---

## Part B — Paystack

1. Sign in at [paystack.com](https://paystack.com) and complete their onboarding.
2. **Stay in Test mode** for now — there's a toggle in the dashboard. Test mode
   takes no real money.
3. Go to **Settings → API Keys & Webhooks**.
4. Copy your **Test Secret Key** (`sk_test_…`) and **Test Public Key**
   (`pk_test_…`).

Keep both — you'll paste them in the next step. Live keys look the same but
start with `sk_live_` / `pk_live_`; only switch to those once you're happy.

---

## Part C — Run it locally

From the project folder:

```bash
cp .env.example .env.local
```

Open `.env.local` and fill it in:

```bash
NEXT_PUBLIC_SUPABASE_URL=https://your-project-ref.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY=pk_test_xxxxxxxx
PAYSTACK_SECRET_KEY=sk_test_xxxxxxxx

NEXT_PUBLIC_SITE_URL=http://localhost:3000
```

Then:

```bash
npm run dev
```

**How to tell it worked**

- The homepage lists three properties (from Supabase, not the built-in fallback).
- Open any property, pick dates, and click **Reserve now**.
- Checkout should redirect you to a Paystack page. Pay with a test card from
  Paystack's test-payments reference, then you'll land back on
  `/checkout/success`, which confirms the charge server-side.

> If the homepage still shows three properties but you're not sure whether they
> came from Supabase, delete a row in **Table Editor** and refresh. If it
> disappears, Supabase is connected. (Before connection the app falls back to
> the catalogue bundled in `app/lib/data.ts`.)

---

## Part D — Deploy

1. Push to GitHub and import the repo in Vercel.
2. **Project → Settings → Environment Variables** — add all six from Part C,
   with `NEXT_PUBLIC_SITE_URL` set to your real domain
   (e.g. `https://www.cosycrest.com`, no trailing slash).
3. **Redeploy.** Environment variables only apply to new deployments.

---

## Part E — The webhook (do this after deploying)

A webhook is how Paystack tells your server "this payment succeeded" even if the
guest closes the browser. Without it, bookings still confirm via the callback
page, but a dropped connection could lose one.

1. In Paystack: **Settings → API Keys & Webhooks**.
2. Set the **Webhook URL** to:

   ```
   https://your-domain.com/api/payments/paystack/webhook
   ```

3. Save.

Paystack will now POST every event there. Your route verifies the
`x-paystack-signature` header (HMAC-SHA512 of the raw body, using your secret
key) and marks the booking paid/confirmed on `charge.success`.

**Important:** Paystack cannot deliver to `localhost` — the URL must be publicly
reachable. To test webhooks locally, expose your dev server with a tunnel
(ngrok, Cloudflare Tunnel, and similar) and use that URL temporarily.

---

## Part F — Test the whole thing

1. Open a property, choose dates, click **Reserve now**.
2. Complete the Paystack test checkout.
3. You should land on **Payment Confirmed** with a reference and amount.
4. In Supabase **Table Editor → bookings**, that row should now have
   `status = confirmed`, `payment_status = paid`, and a `payment_reference`.

To also verify the webhook fired, open the Paystack dashboard's webhook/event
log and confirm the `charge.success` delivery shows a 200.

---

## Troubleshooting

| Symptom | Cause |
| --- | --- |
| Properties show but change never persists | Supabase not configured — you're seeing the bundled fallback in `app/lib/data.ts` |
| "Payments are not configured" / `503` | `PAYSTACK_SECRET_KEY` missing or misspelled |
| Checkout says the booking can't be completed | `NEXT_PUBLIC_SUPABASE_URL` / `ANON_KEY` wrong, or the `villas` table is empty |
| Redirected to Paystack, then "Payment not confirmed" | Secret key mismatch between environments, or test/live keys mixed |
| Booking stays `pending` after paying | Webhook not set up, or not reachable from the internet |
| Admin → Availability says blockouts aren't persisted | `supabase/schema.sql` hasn't been run |
| Variable changed but nothing happened on Vercel | Env vars only apply after a redeploy |

---

## ⚠️ Before you take real money

The `/admin` panel currently has **no real authentication** — it's a client-side
password gate, and it talks to Supabase with the public anon key. That means
anyone who reads the anon key out of the page source can currently read guest
names, emails and phone numbers from `bookings`, and can edit `villas`.

Put the admin panel behind Supabase Auth (or move its reads/writes to a server
route using `SUPABASE_SERVICE_ROLE_KEY`) and change the permissive policies in
[`supabase/schema.sql`](supabase/schema.sql) to `to authenticated` before
launch.
