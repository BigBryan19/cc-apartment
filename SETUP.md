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
>
> ⚠️ **Running A3 is not optional on an existing project.** A project created
> before these policies existed ships with row-level security wide open.
> Because the publishable key is embedded in the browser bundle, anyone who
> views your page source can then read every row of `bookings` and `invoices`
> — guest names, emails and phone numbers — with a plain HTTPS request. That
> exposure ends the moment `schema.sql` runs.
>
> Check it yourself both ways. Before: send a request to
> `/rest/v1/bookings?select=guest_email` with your publishable key as the
> `apikey` header and see whether guest rows come back. After: the same
> request should return `[]` or a permission error.

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

The Project URL is **not** on the API Keys page — click the **Connect** button
in the dashboard's top bar and it is shown there as
`https://<project-ref>.supabase.co`.

The panel has two tabs: **Publishable and secret API keys**, and **Legacy anon,
service_role API keys**. Supabase is retiring the legacy pair by the end of
2026, so prefer the new tab where your project has it. The mapping is:

| Dashboard | Example | Environment variable |
| --- | --- | --- |
| Publishable key | `sb_publishable_Rm67p…` | `NEXT_PUBLIC_SUPABASE_ANON_KEY` |
| Secret key | `sb_secret_206Eh…` | `SUPABASE_SERVICE_ROLE_KEY` |
| *(legacy)* anon | `eyJhbGci…` | `NEXT_PUBLIC_SUPABASE_ANON_KEY` |
| *(legacy)* service_role | `eyJhbGci…` | `SUPABASE_SERVICE_ROLE_KEY` |

The variable names are just slots — what matters is that the **publicly
shareable** key goes in `ANON_KEY` and the **privileged** key goes in
`SERVICE_ROLE_KEY`.

Two things to know about the new keys:

- **They are not JWTs.** Send them on the `apikey` header.
  `@supabase/supabase-js` additionally mirrors the key into
  `Authorization: Bearer …` when nobody is signed in; Supabase accepts this for
  migration compatibility, but if you ever see a bare `Invalid JWT` response,
  that header is the cause.
- **A secret key returns HTTP 401 if used in a browser.** Supabase matches on
  the `User-Agent`. That is a safety net, not a licence to expose it: this
  project reads it only in `app/lib/supabase-server.ts`, which imports
  `server-only` so it can never be bundled into client code.

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

### A4. Create your admin login

With RLS tightened, `/admin` is unreachable until at least one user exists —
the login page will reject everything while the users list is empty.

1. Dashboard → **Authentication → Users** → **Add user** → **Create new user**.
2. Enter your email and a strong password, and tick **Auto Confirm User**.
   (Without that tick Supabase sends a confirmation email, and you cannot sign
   in until it is confirmed.)
3. Visit `/admin` — you should be redirected to `/admin/login`. Sign in.

To create additional admins, repeat this. To remove someone's access, delete
their user there.

> Using one shared login for the whole team makes it impossible to tell who did
> what. If more than one person needs access, create one user each.

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

> Only the secret key is actually read by the code. The current flow redirects
> to Paystack's hosted page, so the public key is unused — it is kept for a
> future inline-checkout switch.

---

## Part B2 — Receipt emails (Resend)

After a successful payment the guest is emailed a receipt, and the same
document is downloadable from the confirmation page. Sending uses
[Resend](https://resend.com), which has a free tier.

**This step is optional.** Without it the site, the payments and the
downloadable receipt all still work — the guest just does not get the email.

1. Create a Resend account.
2. **Verify a domain** you control (Domains → Add Domain) and add the DNS
   records it gives you. You cannot send from `@gmail.com` — Resend only
   permits addresses on a domain you have verified.
   - Testing before your domain is ready? Resend lets you send from
     `onboarding@resend.dev`, but **only to the email address you signed up
     with**. Useful for proving the wiring, not for real guests.
3. **API Keys → Create API Key**, and copy the `re_…` value.
4. Set these two variables:

   | Variable | Example |
   | --- | --- |
   | `RESEND_API_KEY` | `re_xxxxxxxx` |
   | `RECEIPT_FROM_EMAIL` | `Cosy Crest <receipts@yourdomain.com>` |

Receipts are sent at most once per booking: the webhook and `/verify` both try,
and the first to succeed stamps `receipt_sent_at` so the guest never receives
two copies. If sending fails, nothing is stamped and the other path retries.

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

> **This one catches everybody.** The `NEXT_PUBLIC_*` values are inlined into
> the JavaScript bundle **when the build runs**, not read at request time. So
> adding them to Vercel and hitting *Redeploy* is what makes them take effect —
> and changing them later always needs another rebuild. The same applies
> locally: if you add keys to `.env.local` while `npm run dev` is running,
> restart it; if you are serving a production build, run `npm run build` again.
> Symptom of getting this wrong: the site still behaves as if nothing is
> configured, and the admin login page shows the amber "not configured in this
> build" banner.

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

## Security model

The admin panel is protected by **Supabase Auth**. `middleware.ts` intercepts
every request under `/admin` and redirects to `/admin/login` unless there is a
valid session, and the row-level security policies in
[`supabase/schema.sql`](supabase/schema.sql) restrict writes — plus reads of
`bookings`, which hold guest contact details — to the `authenticated` role.

| Table | Read | Write |
| --- | --- | --- |
| `villas` | public (guests browse listings) | admin only |
| `blocked_dates` | public (calendar greys them out before login) | admin only |
| `bookings` | **admin only** | insert is public; read/update/delete admin only |

Two things worth understanding about this design:

- **`bookings` insert is public by design.** A guest has no account, so the
  checkout fallback has to be able to write one. The primary path creates the
  booking server-side in `/api/payments/paystack/initialize` using the
  service-role key, which bypasses RLS entirely. The open insert means someone
  could spam junk rows; if that becomes a problem, move the fallback
  server-side too and change the policy to `to authenticated`.
- **The policies grant access to *any* signed-in user, not to a specific
  person.** With a single admin account that is equivalent. If you ever add a
  second user who should not see everything, scope the policies with something
  like `using (auth.uid() = owner_id)`.

Finally: keep `SUPABASE_SERVICE_ROLE_KEY` off the client. It is read only in
`app/lib/supabase-server.ts`, which imports `server-only` so it can never be
bundled into browser code. A secret key is additionally rejected with HTTP 401
if it is ever sent from a browser.
