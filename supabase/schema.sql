-- ===========================================================================
-- Cosy Crest — Supabase bootstrap
--
-- Paste this whole file into Supabase Dashboard > SQL Editor > New query and
-- press Run. It is idempotent: safe to run again on an existing project.
--
-- It creates everything the app expects:
--   villas         — the property catalogue (public read)
--   bookings       — reservations + Paystack payment fields
--   blocked_dates  — admin-defined unavailable ranges
--
-- ⚠️  SECURITY NOTE — READ BEFORE GOING LIVE
-- The admin panel (/admin) has no Supabase Auth. It talks to the database with
-- the *public anon key*, which is embedded in the browser bundle, so the
-- policies below are deliberately permissive enough to keep it working. That
-- means anyone who reads the anon key out of the page source can also read
-- guest names, emails and phone numbers in `bookings`, and can write to
-- `villas`. This is acceptable while staffing a demo, but it is NOT acceptable
-- once real bookings and payments are flowing. Before launch, put the admin
-- panel behind Supabase Auth (or move admin reads/writes to a server route
-- using SUPABASE_SERVICE_ROLE_KEY) and tighten these policies to
-- `to authenticated`.
-- ===========================================================================


-- ---------------------------------------------------------------------------
-- 1. Properties
-- ---------------------------------------------------------------------------
create table if not exists public.villas (
  id          bigserial primary key,
  title       text        not null,
  location    text,
  price       numeric     not null default 0,     -- headline nightly rate (GHS)
  guests      integer     not null default 2,
  bedrooms    integer     not null default 1,
  bathrooms   integer     not null default 1,
  has_pool    boolean     not null default false,
  image       text,                                -- card / hero image path
  images      text[]      not null default '{}',   -- gallery
  video       text,
  description text,
  amenities   text[]      not null default '{}',
  -- [{ "option": "Whole apartment", "amount": 3500 }, ...]
  rates       jsonb       not null default '[]'::jsonb,
  -- { "lat": 5.72, "lng": -0.12 }
  coordinates jsonb,
  created_at  timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- 2. Bookings
-- ---------------------------------------------------------------------------
create table if not exists public.bookings (
  id              bigserial primary key,
  villa_id        bigint references public.villas (id) on delete set null,
  guest_name      text,
  guest_email     text,
  guest_phone     text,
  check_in_date   date,
  total_amount    numeric,
  payment_method  text,
  status          text not null default 'pending',  -- pending | confirmed | cancelled
  created_at      timestamptz not null default now()
);

-- Columns used by the Paystack flow. Separate ALTERs so this file also
-- upgrades a `bookings` table created by an earlier version of the schema.
alter table public.bookings
  add column if not exists check_out_date    date,
  add column if not exists nights            integer,
  add column if not exists currency          text default 'GHS',
  add column if not exists packages          text[],
  add column if not exists payment_reference text,
  add column if not exists payment_status    text default 'unpaid',
  add column if not exists paid_at           timestamptz,
  add column if not exists amount_paid       numeric;

-- The webhook matches a booking by reference when metadata is unavailable.
create unique index if not exists bookings_payment_reference_key
  on public.bookings (payment_reference)
  where payment_reference is not null;

create index if not exists bookings_villa_dates_idx
  on public.bookings (villa_id, check_in_date, check_out_date);

-- ---------------------------------------------------------------------------
-- 3. Admin-blocked date ranges
-- ---------------------------------------------------------------------------
create table if not exists public.blocked_dates (
  id         uuid        primary key default gen_random_uuid(),
  villa_id   bigint      not null,
  start_date date        not null,
  end_date   date        not null,
  reason     text,
  created_at timestamptz not null default now(),
  constraint blocked_dates_range_valid check (end_date >= start_date)
);

create index if not exists blocked_dates_villa_idx
  on public.blocked_dates (villa_id, start_date, end_date);

-- ---------------------------------------------------------------------------
-- 4. Row Level Security
--    Guests must read villas and blocked dates without signing in.
--    See the security note at the top of this file about the write policies.
-- ---------------------------------------------------------------------------
alter table public.villas        enable row level security;
alter table public.bookings      enable row level security;
alter table public.blocked_dates enable row level security;

-- Properties: public read, public write (admin panel is unauthenticated).
drop policy if exists "villas_public_read"  on public.villas;
create policy "villas_public_read"
  on public.villas for select using (true);

drop policy if exists "villas_public_write" on public.villas;
create policy "villas_public_write"
  on public.villas for all using (true) with check (true);

-- Blocked dates: public read (so the calendar can grey them out), public write.
drop policy if exists "blocked_dates_public_read"  on public.blocked_dates;
create policy "blocked_dates_public_read"
  on public.blocked_dates for select using (true);

drop policy if exists "blocked_dates_public_write" on public.blocked_dates;
create policy "blocked_dates_public_write"
  on public.blocked_dates for all using (true) with check (true);

-- Bookings: guests create their own at checkout, so anon needs INSERT.
drop policy if exists "bookings_public_insert" on public.bookings;
create policy "bookings_public_insert"
  on public.bookings for insert with check (true);

-- The admin bookings/availability screens read reservations with the anon key.
-- Replace these with `to authenticated` once the admin panel has a real login.
drop policy if exists "bookings_public_read"   on public.bookings;
create policy "bookings_public_read"
  on public.bookings for select using (true);

drop policy if exists "bookings_public_update" on public.bookings;
create policy "bookings_public_update"
  on public.bookings for update using (true) with check (true);


-- ---------------------------------------------------------------------------
-- 5. Optional starter data — mirrors app/lib/data.ts so the site is not empty
--    on first load. Delete this block if you would rather start blank.
-- ---------------------------------------------------------------------------
insert into public.villas
  (id, title, location, price, guests, bedrooms, bathrooms, has_pool,
   image, images, description, amenities, rates, coordinates)
values
  (1, 'Lakeside Estate', 'Greater Accra • Lakeside', 2000, 4, 3, 5, true,
   '/Lake1.jpg', array['/Lake1.jpg','/Lake2.jpg','/Lake3.jpg','/Lake4.jpg'],
   'Experience comfort, privacy, and elegance in this beautifully furnished apartment located in the serene and secure Lakeside Estate.',
   array['Free Wi-Fi','Kitchen','Pool','Well-furnished hall','Television in all rooms','PS5 Gaming Console'],
   '[{"option":"One bedrooms","amount":1500},{"option":"Two bedrooms","amount":2000},{"option":"Whole apartment","amount":3500},{"option":"Monthly Rate","amount":36000}]'::jsonb,
   '{"lat":5.726743173934811,"lng":-0.1200319741836416}'::jsonb),

  (2, 'Aburi Mountain Retreat', 'Eastern Region • Aburi', 600, 4, 4, 5, true,
   '/Aburi1.jpeg', array['/Aburi1.jpeg','/Aburi2.jpeg','/Aburi3.jpeg','/Aburi4.jpeg'],
   'Nestled in the serene and refreshing environment of Aburi, this beautifully furnished apartment offers complete comfort.',
   array['Free Wi-Fi','Kitchen','Pool','Well-furnished hall','Television in all rooms'],
   '[{"option":"Single bedroom","amount":600},{"option":"Studio","amount":800},{"option":"One bedrooms","amount":1200},{"option":"Two bedrooms","amount":2000},{"option":"Whole apartment","amount":3500},{"option":"Monthly Rate","amount":30000}]'::jsonb,
   '{"lat":5.843870554138503,"lng":-0.17225994962774632}'::jsonb),

  (3, 'Adenta Serenity', 'Greater Accra • Adenta', 600, 4, 4, 5, true,
   '/Adenta1.jpg', array['/Adenta1.jpg','/Adenta2.jpg','/Adenta3.jpg','/Adenta4.jpg'],
   'Located in the heart of Adenta, this premium apartment combines luxury, comfort, and entertainment with modern furnishings and a grand piano.',
   array['Free Wi-Fi','Kitchen','Pool','Well-furnished hall','Grand Piano','PS5 Gaming Console'],
   '[{"option":"One bedroom","amount":1500},{"option":"Two bedrooms","amount":2000},{"option":"Whole apartment","amount":3500},{"option":"Monthly Rate","amount":36000}]'::jsonb,
   '{"lat":5.712737022781674,"lng":-0.16226067413187414}'::jsonb)
on conflict (id) do nothing;

-- Keep the sequence ahead of the explicit ids above, otherwise the next
-- villa added from /admin collides with id 1.
select setval(
  pg_get_serial_sequence('public.villas', 'id'),
  greatest((select coalesce(max(id), 1) from public.villas), 1)
);
