-- ---------------------------------------------------------------------------
-- Cosy Crest — Supabase schema additions
--
-- Run this in Supabase Dashboard > SQL Editor (or `supabase db push`).
-- Safe to re-run: every statement is idempotent.
-- ---------------------------------------------------------------------------

-- ---------------------------------------------------------------------------
-- 1. Admin-blocked date ranges
-- ---------------------------------------------------------------------------
create table if not exists public.blocked_dates (
  id          uuid primary key default gen_random_uuid(),
  -- Matches villas.id (numeric in this project). Change to uuid if you
  -- migrate the villas table to uuid primary keys.
  villa_id    bigint not null,
  start_date  date   not null,
  end_date    date   not null,
  reason      text,
  created_at  timestamptz not null default now(),
  constraint blocked_dates_range_valid check (end_date >= start_date)
);

create index if not exists blocked_dates_villa_idx
  on public.blocked_dates (villa_id, start_date, end_date);

-- ---------------------------------------------------------------------------
-- 2. Booking columns used by the Paystack flow
-- ---------------------------------------------------------------------------
alter table public.bookings
  add column if not exists check_out_date     date,
  add column if not exists nights             integer,
  add column if not exists currency           text default 'GHS',
  add column if not exists packages           text[],
  add column if not exists payment_reference  text,
  add column if not exists payment_status     text default 'unpaid',
  add column if not exists paid_at            timestamptz,
  add column if not exists amount_paid        numeric;

create unique index if not exists bookings_payment_reference_key
  on public.bookings (payment_reference)
  where payment_reference is not null;

-- Keep the updated_at column in sync if it exists.
create or replace function public.touch_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- ---------------------------------------------------------------------------
-- 3. Row Level Security
-- ---------------------------------------------------------------------------
alter table public.blocked_dates enable row level security;

-- Anyone (including anonymous guests) may read blocked dates to grey them out
-- in the booking calendar.
drop policy if exists "blocked_dates_public_read" on public.blocked_dates;
create policy "blocked_dates_public_read"
  on public.blocked_dates for select
  using (true);

-- Only authenticated admins may manage the ranges.
drop policy if exists "blocked_dates_admin_write" on public.blocked_dates;
create policy "blocked_dates_admin_write"
  on public.blocked_dates for all
  to authenticated
  using (true)
  with check (true);

-- ---------------------------------------------------------------------------
-- 4. Optional: expiring holds
--    Booking rows stay 'pending' until Paystack confirms them via webhook.
-- ---------------------------------------------------------------------------
alter table public.bookings
  add column if not exists created_at timestamptz not null default now();
