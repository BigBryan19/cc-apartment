-- ---------------------------------------------------------------------------
-- Gallery media, owner settings and deposit payments.
--
-- Safe to run more than once: every statement is guarded with IF NOT EXISTS or
-- a matching DROP POLICY. Run it in the Supabase SQL editor before deploying the
-- code that reads these columns, otherwise the checkout still works but the
-- deposit fields are not stored (the API retries without them).
-- ---------------------------------------------------------------------------

-- ---------------------------------------------------------------------------
-- 1. Gallery
-- ---------------------------------------------------------------------------
create table if not exists public.gallery_media (
  id          uuid        primary key default gen_random_uuid(),
  type        text        not null default 'photo'
                          check (type in ('photo', 'video')),
  src         text        not null,
  poster      text,
  category    text        not null default 'stays'
                          check (category in ('stays', 'birthdays', 'couples', 'other')),
  title       text        not null default 'Cosy Crest',
  caption     text,
  villa_id    bigint      references public.villas (id) on delete set null,
  sort_order  integer     not null default 0,
  created_at  timestamptz not null default now()
);

create index if not exists gallery_media_order_idx
  on public.gallery_media (sort_order);

alter table public.gallery_media enable row level security;

drop policy if exists "gallery_public_read" on public.gallery_media;
drop policy if exists "gallery_admin_write" on public.gallery_media;

-- The gallery is public by definition — guests browse it before signing in.
create policy "gallery_public_read"
  on public.gallery_media for select using (true);

create policy "gallery_admin_write"
  on public.gallery_media for all
  to authenticated
  using (true) with check (true);

-- ---------------------------------------------------------------------------
-- 2. Owner settings (key/value)
--
--    The deposit policy lives here. It is readable by anyone because the
--    checkout must show the guest what is due today before they pay; it is
--    writable only by a signed-in admin.
-- ---------------------------------------------------------------------------
create table if not exists public.site_settings (
  key         text        primary key,
  value       jsonb       not null default '{}'::jsonb,
  updated_at  timestamptz not null default now()
);

alter table public.site_settings enable row level security;

drop policy if exists "site_settings_public_read" on public.site_settings;
drop policy if exists "site_settings_admin_write" on public.site_settings;

create policy "site_settings_public_read"
  on public.site_settings for select using (true);

create policy "site_settings_admin_write"
  on public.site_settings for all
  to authenticated
  using (true) with check (true);

-- No deposit is seeded. The policy is unconfigured until the owner sets one in
-- Admin → Settings, and the checkout offers pay-in-full plus an enquiry until
-- then. Seeding a percentage here would be inventing a payment commitment.

-- ---------------------------------------------------------------------------
-- 3. Deposit payments on bookings
-- ---------------------------------------------------------------------------
alter table public.bookings
  add column if not exists payment_plan     text    default 'full',
  add column if not exists deposit_amount   numeric default 0,
  add column if not exists balance_due      numeric default 0,
  add column if not exists balance_due_date date;

-- Legacy rows have no plan; treat them as paid in full so nothing reports a
-- phantom balance.
update public.bookings
   set payment_plan = 'full'
 where payment_plan is null;

-- A deposit is a part-payment. The status column records the booking lifecycle
-- (pending / confirmed / cancelled) and payment_status records the money
-- (pending / partially_paid / paid / refunded). They are deliberately separate.
comment on column public.bookings.payment_status is
  'pending | partially_paid | paid | refunded — money state, independent of booking status';
comment on column public.bookings.status is
  'pending | confirmed | cancelled — reservation state, independent of payment_status';
