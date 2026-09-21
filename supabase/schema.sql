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
-- ACCESS MODEL
-- The admin panel is protected by Supabase Auth: middleware.ts redirects any
-- request under /admin to /admin/login unless there is a valid session, and
-- the policies in section 4 restrict every write — plus reads of `bookings`,
-- which contain guest contact details — to the `authenticated` role.
--
-- You must create an admin user before /admin is usable. See SETUP.md,
-- "Part A4: create your admin login". Without one, the login page will reject
-- every attempt because no user exists.
--
-- Nothing here depends on the service-role key except the Paystack routes,
-- which run server-side only.
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

-- If a `villas` table already existed (e.g. from an earlier version of this
-- project), the CREATE above was skipped. Bring any missing columns up to date.
-- These are added as nullable with defaults so they are safe on a table that
-- already holds rows.
alter table public.villas
  add column if not exists title       text,
  add column if not exists location    text,
  add column if not exists price       numeric default 0,
  add column if not exists guests      integer default 2,
  add column if not exists bedrooms    integer default 1,
  add column if not exists bathrooms   integer default 1,
  add column if not exists has_pool    boolean default false,
  add column if not exists image       text,
  add column if not exists images      text[]  default '{}',
  add column if not exists video       text,
  add column if not exists description text,
  add column if not exists amenities   text[]  default '{}',
  add column if not exists rates       jsonb   default '[]'::jsonb,
  add column if not exists coordinates jsonb,
  add column if not exists created_at  timestamptz default now();

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
--
--    READ MODEL
--      villas        — public. Guests browse listings without signing in.
--      blocked_dates — public. The calendar greys these out before login.
--      bookings      — AUTHENTICATED ONLY. These rows hold guest names, emails
--                      and phone numbers. The publishable key ships in the
--                      browser bundle, so `using (true)` here would publish
--                      every guest's contact details to the internet.
--
--    WRITE MODEL
--      Everything except a guest creating their own booking requires a
--      signed-in admin (see middleware.ts and /admin/login).
--
--    Policies are dropped first so this file can be re-run on a project that
--    still has the older permissive versions.
-- ---------------------------------------------------------------------------
alter table public.villas        enable row level security;
alter table public.bookings      enable row level security;
alter table public.blocked_dates enable row level security;

-- --- Properties: anyone may browse, only an admin may edit ------------------
drop policy if exists "villas_public_read"  on public.villas;
drop policy if exists "villas_public_write" on public.villas;
drop policy if exists "villas_admin_write"  on public.villas;

create policy "villas_public_read"
  on public.villas for select using (true);

create policy "villas_admin_write"
  on public.villas for all
  to authenticated
  using (true) with check (true);

-- --- Blocked dates: anyone may read, only an admin may edit -----------------
drop policy if exists "blocked_dates_public_read"  on public.blocked_dates;
drop policy if exists "blocked_dates_public_write" on public.blocked_dates;
drop policy if exists "blocked_dates_admin_write"  on public.blocked_dates;

create policy "blocked_dates_public_read"
  on public.blocked_dates for select using (true);

create policy "blocked_dates_admin_write"
  on public.blocked_dates for all
  to authenticated
  using (true) with check (true);

-- --- Bookings: guests may create one; only an admin may read or change ------
drop policy if exists "bookings_public_insert" on public.bookings;
drop policy if exists "bookings_public_read"   on public.bookings;
drop policy if exists "bookings_public_update" on public.bookings;
drop policy if exists "bookings_admin_all"     on public.bookings;

-- INSERT stays open so the checkout fallback (Supabase configured, Paystack
-- not yet) can still record a request. The primary path creates the booking
-- server-side in /api/payments/paystack/initialize with the service-role key,
-- which bypasses RLS entirely.
create policy "bookings_public_insert"
  on public.bookings for insert with check (true);

-- SELECT / UPDATE / DELETE are admin-only. This is the policy that stops the
-- publishable key from reading guest contact details.
create policy "bookings_admin_all"
  on public.bookings for all
  to authenticated
  using (true) with check (true);

-- --- Invoices: not read by the app at all, but it holds the same guest PII
--     (name, email, phone) and is equally readable with the publishable key,
--     so it gets the same treatment. Guarded so this still runs on a project
--     that never had the table. ---------------------------------------------
do $$
begin
  if exists (
    select 1 from information_schema.tables
     where table_schema = 'public' and table_name = 'invoices'
  ) then
    execute 'alter table public.invoices enable row level security';
    execute 'drop policy if exists "invoices_public_read" on public.invoices';
    execute 'drop policy if exists "invoices_public_write" on public.invoices';
    execute 'drop policy if exists "invoices_admin_all" on public.invoices';
    execute 'create policy "invoices_admin_all" on public.invoices
               for all to authenticated using (true) with check (true)';
  end if;
end $$;


-- ---------------------------------------------------------------------------
-- 5. Optional starter data — mirrors app/lib/data.ts so the site is not empty
--    on first load. Delete this block if you would rather start blank.
--
--    Only runs when `villas` is completely empty, so it can never overwrite or
--    collide with properties you already have. It deliberately does NOT set
--    `id`, so it works whether the key is bigserial or uuid — and a fresh
--    bigserial table will assign 1, 2, 3, matching app/lib/data.ts.
-- ---------------------------------------------------------------------------
do $$
begin
  if (select count(*) from public.villas) = 0 then
    insert into public.villas
      (title, location, price, guests, bedrooms, bathrooms, has_pool,
       image, images, description, amenities, rates, coordinates)
      values
      ('Lakeside Estate', 'Greater Accra • Lakeside', 2000, 4, 3, 5, true,
       '/Lake1.jpg', array['/Lake1.jpg','/Lake2.jpg','/Lake3.jpg','/Lake4.jpg'],
       'Experience comfort, privacy, and elegance in this beautifully furnished apartment located in the serene and secure Lakeside Estate.',
       array['Free Wi-Fi','Kitchen','Pool','Well-furnished hall','Television in all rooms','PS5 Gaming Console'],
       '[{"option":"One bedrooms","amount":1500},{"option":"Two bedrooms","amount":2000},{"option":"Whole apartment","amount":3500},{"option":"Monthly Rate","amount":36000}]'::jsonb,
       '{"lat":5.726743173934811,"lng":-0.1200319741836416}'::jsonb),

      ('Aburi Mountain Retreat', 'Eastern Region • Aburi', 600, 4, 4, 5, true,
       '/Aburi1.jpeg', array['/Aburi1.jpeg','/Aburi2.jpeg','/Aburi3.jpeg','/Aburi4.jpeg'],
       'Nestled in the serene and refreshing environment of Aburi, this beautifully furnished apartment offers complete comfort.',
       array['Free Wi-Fi','Kitchen','Pool','Well-furnished hall','Television in all rooms'],
       '[{"option":"Single bedroom","amount":600},{"option":"Studio","amount":800},{"option":"One bedrooms","amount":1200},{"option":"Two bedrooms","amount":2000},{"option":"Whole apartment","amount":3500},{"option":"Monthly Rate","amount":30000}]'::jsonb,
       '{"lat":5.843870554138503,"lng":-0.17225994962774632}'::jsonb),

      ('Adenta Serenity', 'Greater Accra • Adenta', 600, 4, 4, 5, true,
       '/Adenta1.jpg', array['/Adenta1.jpg','/Adenta2.jpg','/Adenta3.jpg','/Adenta4.jpg'],
       'Located in the heart of Adenta, this premium apartment combines luxury, comfort, and entertainment with modern furnishings and a grand piano.',
       array['Free Wi-Fi','Kitchen','Pool','Well-furnished hall','Grand Piano','PS5 Gaming Console'],
       '[{"option":"One bedroom","amount":1500},{"option":"Two bedrooms","amount":2000},{"option":"Whole apartment","amount":3500},{"option":"Monthly Rate","amount":36000}]'::jsonb,
       '{"lat":5.712737022781674,"lng":-0.16226067413187414}'::jsonb);
   end if;
end $$;

-- ---------------------------------------------------------------------------
-- 6. Data repair — asset paths that 404 on case-sensitive hosts
--
--    Rows seeded before this file was corrected store lower-case paths
--    ("/lake1.jpg") while the files in /public are capitalised ("/Lake1.jpg").
--    macOS treats those as the same file, so this went unnoticed locally — but
--    on Vercel the filesystem is case-sensitive and every one of those images
--    returns 404. Scoped to exactly the "/lake…" prefix so it cannot touch
--    anything else.
-- ---------------------------------------------------------------------------
update public.villas
   set image = regexp_replace(image, '^/lake', '/Lake')
 where image like '/lake%';

update public.villas
   set images = array(
     select regexp_replace(entry, '^/lake', '/Lake') from unnest(images) as entry
   )
 where images is not null
   and array_to_string(images, ',') like '%/lake%';
