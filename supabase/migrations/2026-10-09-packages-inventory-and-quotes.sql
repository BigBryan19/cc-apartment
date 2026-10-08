-- ===========================================================================
-- Cosy Crest — packages, per-unit inventory, enquiries and quotes
--
-- Idempotent and additive. It never drops a column, never rewrites a stored
-- amount, and never deletes a row. Existing bookings, guests, properties and
-- payment history are preserved exactly as they are; the backfill at the end
-- only *populates new columns* from data that is already there.
--
-- Run AFTER supabase/schema.sql. Safe to run before or after
-- supabase/admin-role.sql (this file defines is_admin() if it is missing).
--
-- ORDER OF SECTIONS
--   1. Shared helpers
--   2. Inventory: per-unit allocation with a hard overlap guarantee
--   3. Bookings: dual status tracks, unit, event and money columns
--   4. Packages: admin-managed catalogue
--   5. Enquiries and quotes
--   6. Activity log
--   7. Row-level security
--   8. Backfill of existing rows
--   9. Verification queries
--
-- A NOTE ON supabase/schema.sql
--   That file is STALE relative to production and should not be used to reason
--   about the live table. It describes `bookings.id` as `bigserial` with ten
--   columns; production actually has `id uuid` and already carries `nights`,
--   `check_out_date`, `currency`, `packages`, `paid_at`, `amount_paid`,
--   `payment_reference`, `payment_status` and `receipt_sent_at`. Something
--   altered the table after schema.sql was written and was never recorded.
--
--   This migration therefore uses `add column if not exists` for everything and
--   asserts nothing about the existing shape. Regenerating schema.sql from the
--   live database is worth doing as its own task.
--
-- WHY INVENTORY IS A TABLE AND NOT A CHECK
--   "Concurrent customers cannot confirm the same exclusive inventory" cannot be
--   enforced by reading rows and then writing, because two requests can both read
--   "free" before either writes. It needs the database to refuse the second
--   insert, which is what the exclusion constraint in section 2 does.
-- ===========================================================================

-- ---------------------------------------------------------------------------
-- 1. Shared helpers
-- ---------------------------------------------------------------------------

-- btree_gist supplies the equality operator classes the exclusion constraint in
-- section 2 needs. On Supabase, extensions live in the `extensions` schema, and
-- if that schema is not on the search_path the constraint silently cannot be
-- created — leaving the inventory guarantee absent while everything else
-- succeeds. Set it explicitly rather than relying on the project default.
set search_path = public, extensions;

create extension if not exists btree_gist;

-- Defined in supabase/admin-role.sql. Re-declared here so this migration is
-- self-sufficient when run alone.
create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public, auth
as $$
  select coalesce(
    (
      select u.raw_app_meta_data ->> 'role'
        from auth.users u
       where u.id = auth.uid()
    ) = 'admin',
    false
  );
$$;

comment on function public.is_admin() is
  'True only for a user an administrator has explicitly flagged in app_metadata.role.';

-- A short, unambiguous, guest-quotable reference. Not a secret: it identifies a
-- request, unlike the receipt reference which is an access token.
create or replace function public.make_reference(prefix text)
returns text
language plpgsql
as $$
declare
  alphabet text := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';  -- no I, O, 0, 1
  result text := '';
  i int;
begin
  for i in 1..6 loop
    result := result || substr(alphabet, 1 + floor(random() * length(alphabet))::int, 1);
  end loop;
  return prefix || '-' || to_char(now(), 'YYMM') || '-' || result;
end;
$$;

-- ---------------------------------------------------------------------------
-- 2. Inventory
-- ---------------------------------------------------------------------------
--
-- One row per (property, unit, date range) that is held. Written when a booking
-- is created and released when it is cancelled.
--
-- THE INSERTION PROTOCOL — this is what makes whole-property and individual-room
-- inventory overlap correctly:
--
--   • Booking a ROOM inserts one row: (villa_id, '<unit-id>', range).
--   • Booking a WHOLE PROPERTY inserts one row for EVERY active unit of that
--     property, plus a 'whole-property' row. So it collides with any future room
--     booking, and a later whole-property attempt collides with any existing room
--     booking. Both directions are covered by the same constraint.
--
-- `[)` bounds: the check-out day is not held, so a same-day turnaround is allowed
-- — the same convention app/lib/dates.ts already uses.

create table if not exists public.accommodation_allocations (
  id                uuid primary key default gen_random_uuid(),
  booking_id        uuid references public.bookings (id) on delete cascade,
  villa_id          integer not null,
  unit_id           text    not null,
  check_in_date     date    not null,
  check_out_date    date    not null,
  created_at        timestamptz not null default now(),
  constraint accommodation_allocations_range_valid check (check_out_date > check_in_date)
);

-- The hard guarantee. Two overlapping holds for the same unit cannot coexist,
-- regardless of how many requests race.
do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'accommodation_allocations_no_overlap'
  ) then
    alter table public.accommodation_allocations
      add constraint accommodation_allocations_no_overlap
      exclude using gist (
        villa_id       with =,
        unit_id        with =,
        daterange(check_in_date, check_out_date, '[)') with &&
      );
  end if;
end $$;

create index if not exists accommodation_allocations_villa_dates_idx
  on public.accommodation_allocations (villa_id, check_in_date, check_out_date);

create index if not exists accommodation_allocations_booking_idx
  on public.accommodation_allocations (booking_id);

comment on table public.accommodation_allocations is
  'Held inventory per unit per date range. The exclusion constraint is the only defence against double-booking under concurrency; never replace it with an application-level check.';

-- Expiring, non-confirming holds. Lets the checkout put dates aside while the
-- guest is in Paystack without permanently blocking them.
create table if not exists public.inventory_holds (
  id              uuid primary key default gen_random_uuid(),
  reference       text not null unique,
  villa_id        integer not null,
  unit_id         text not null,
  check_in_date   date not null,
  check_out_date  date not null,
  -- Set when the guest converts the hold into a booking.
  released_at     timestamptz,
  expires_at      timestamptz not null,
  created_at      timestamptz not null default now()
);

create index if not exists inventory_holds_live_idx
  on public.inventory_holds (villa_id, unit_id, expires_at)
  where released_at is null;

-- ---------------------------------------------------------------------------
-- 3. Bookings
-- ---------------------------------------------------------------------------

alter table public.bookings
  -- Which unit of the property was taken. Null on legacy rows, where the
  -- selection was only ever a label.
  add column if not exists accommodation_unit_id   text,
  add column if not exists accommodation_unit_name text,

  -- The two independent tracks. See app/lib/status.ts.
  add column if not exists accommodation_status    text not null default 'pending_payment',
  add column if not exists occasion_status         text not null default 'none',

  -- Occupancy actually charged for. Distinct from attendance.
  add column if not exists guests                  integer,

  -- Event details.
  add column if not exists event_date              date,
  add column if not exists event_start_time        time,
  add column if not exists event_end_time          time,
  add column if not exists attendance              integer,
  add column if not exists overnight_guests        integer,

  -- Package snapshot. Editing a package later must not silently alter what an
  -- existing guest agreed to, so the terms are copied onto the booking.
  add column if not exists package_id              text,
  add column if not exists package_name            text,
  add column if not exists package_snapshot        jsonb,
  add column if not exists policy_version          text,

  -- Money, itemised. `total_amount`/`amount_paid` already exist.
  add column if not exists accommodation_subtotal  numeric,
  add column if not exists package_subtotal        numeric,
  add column if not exists extras_subtotal         numeric,
  add column if not exists fees_subtotal           numeric,
  add column if not exists discount_total          numeric,
  add column if not exists refundable_deposit      numeric,
  add column if not exists due_now                 numeric,
  add column if not exists balance_due             numeric,
  add column if not exists balance_due_date        date,
  -- Labels the guest was told would be quoted separately.
  add column if not exists unpriced_items          jsonb not null default '[]'::jsonb,

  -- The enquiry that produced this booking, when there was one.
  add column if not exists enquiry_id              uuid,
  add column if not exists coordinator             text,
  add column if not exists internal_notes          text;

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'bookings_accommodation_status_valid') then
    alter table public.bookings add constraint bookings_accommodation_status_valid
      check (accommodation_status in ('pending_payment','confirmed','cancelled'));
  end if;

  if not exists (select 1 from pg_constraint where conname = 'bookings_occasion_status_valid') then
    alter table public.bookings add constraint bookings_occasion_status_valid
      check (occasion_status in ('none','requested','under_review','quoted','awaiting_payment','confirmed','cancelled'));
  end if;
end $$;

create index if not exists bookings_occasion_status_idx on public.bookings (occasion_status);
create index if not exists bookings_accommodation_status_idx on public.bookings (accommodation_status);
create index if not exists bookings_enquiry_idx on public.bookings (enquiry_id);
create index if not exists bookings_unit_idx on public.bookings (villa_id, accommodation_unit_id);

comment on column public.bookings.accommodation_status is
  'The stay track. Progresses independently of occasion_status — see app/lib/status.ts.';
comment on column public.bookings.occasion_status is
  'The occasion track. A paid room must never set this to confirmed; only approval plus payment does.';
comment on column public.bookings.internal_notes is
  'Staff only. Never exposed by any guest-facing route or policy.';

-- ---------------------------------------------------------------------------
-- 4. Packages
-- ---------------------------------------------------------------------------
--
-- The bundled catalogue in app/lib/packages.ts seeds this. It ships entirely as
-- drafts because no approved price, inclusion or policy exists in the repository.

create table if not exists public.packages (
  id                    uuid primary key default gen_random_uuid(),
  slug                  text not null unique,
  category              text not null,
  variant               text,
  name                  text not null,
  summary               text not null default '',
  introduction          text not null default '',

  status                text not null default 'draft',
  mode                  text not null default 'quotation',

  who_its_for           jsonb not null default '[]'::jsonb,
  inclusions            jsonb not null default '[]'::jsonb,
  exclusions            jsonb not null default '[]'::jsonb,
  images                jsonb not null default '[]'::jsonb,

  -- Eligibility. Empty arrays mean nothing is approved yet.
  eligible_property_ids jsonb not null default '[]'::jsonb,
  eligible_unit_ids     jsonb not null default '[]'::jsonb,
  accommodation_included boolean,
  can_attach_to_stay     boolean,

  price_basis           text not null default 'quote',
  amount                numeric,
  price_note            text,

  min_guests            integer,
  max_guests            integer,
  minimum_notice_days   integer,

  -- Availability configuration.
  available_from        date,
  available_to          date,
  blackout_dates        jsonb not null default '[]'::jsonb,
  setup_buffer_hours    integer,
  cleanup_buffer_hours  integer,

  -- Commercial terms. Both required before instant booking.
  deposit_fraction      numeric,
  balance_due_days      integer,
  cancellation_policy_id text,
  cancellation_terms    text,
  facility_rules        jsonb not null default '[]'::jsonb,

  required_questions    jsonb not null default '[]'::jsonb,
  faqs                  jsonb not null default '[]'::jsonb,
  internal_notes        text,

  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now(),

  constraint packages_status_valid check (status in ('draft','published','archived')),
  constraint packages_mode_valid   check (mode in ('fixed_price','quotation')),
  constraint packages_category_valid
    check (category in ('honeymoon','birthday','private_gathering')),
  constraint packages_basis_valid
    check (price_basis in ('per_night','per_stay','per_person','per_event','monthly','quote'))
);

create index if not exists packages_status_idx on public.packages (status);
create index if not exists packages_category_idx on public.packages (category);

-- The constraint that makes "do not publish an instantly bookable package
-- without sufficient configuration" a database rule rather than a form
-- validation someone can bypass with a direct API call.
do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'packages_instantly_bookable_complete') then
    alter table public.packages add constraint packages_instantly_bookable_complete
      check (
        status <> 'published'
        or mode <> 'fixed_price'
        or (
              amount is not null and amount > 0
          and price_note is not null and length(btrim(price_note)) > 0
          and max_guests is not null
          and minimum_notice_days is not null
          and cancellation_policy_id is not null
          and jsonb_array_length(inclusions) > 0
          and jsonb_array_length(eligible_property_ids) > 0
        )
      );
  end if;
end $$;

comment on constraint packages_instantly_bookable_complete on public.packages is
  'Blocks publishing an instantly bookable package until price, basis, capacity, notice, policy, inclusions and eligibility are all present. Mirrors canPublish() in app/lib/packages.ts.';

create table if not exists public.package_extras (
  id            uuid primary key default gen_random_uuid(),
  package_id    uuid not null references public.packages (id) on delete cascade,
  extra_key     text not null,
  name          text not null,
  description   text,
  amount        numeric,
  price_basis   text not null default 'per_stay',
  max_quantity  integer not null default 1,
  requires_quote boolean not null default true,
  sort_order    integer not null default 0,
  created_at    timestamptz not null default now(),
  unique (package_id, extra_key),
  constraint package_extras_basis_valid
    check (price_basis in ('per_night','per_stay','per_person','per_event','monthly','quote'))
);

-- Extras sold as part of a booking, snapshotted so a later price change does not
-- alter an existing agreement.
create table if not exists public.booking_extras (
  id            uuid primary key default gen_random_uuid(),
  booking_id    uuid not null references public.bookings (id) on delete cascade,
  extra_key     text not null,
  name          text not null,
  quantity      integer not null default 1,
  unit_amount   numeric,          -- null when unpriced
  amount        numeric,          -- null when unpriced
  price_basis   text not null default 'per_stay',
  requires_quote boolean not null default true,
  created_at    timestamptz not null default now()
);

create index if not exists booking_extras_booking_idx on public.booking_extras (booking_id);

-- ---------------------------------------------------------------------------
-- 5. Enquiries and quotes
-- ---------------------------------------------------------------------------

create table if not exists public.enquiries (
  id                  uuid primary key default gen_random_uuid(),
  reference           text not null unique default public.make_reference('ENQ'),

  category            text not null,
  variant             text,
  package_slug        text,

  guest_name          text not null,
  guest_email         text not null,
  guest_phone         text,

  -- Event shape. Nullable because a room-setup enquiry has no attendance.
  event_date          date,
  event_start_time    time,
  event_end_time      time,
  attendance          integer,
  overnight_guests    integer,
  overnight_required  boolean,

  preferred_property_id integer,
  preferred_unit_id   text,

  -- Free-form answers to the package's required_questions, keyed by question id.
  answers             jsonb not null default '{}'::jsonb,

  status              text not null default 'requested',
  -- The single customer-facing status derived from this row and any booking.
  coordinator         text,
  internal_notes      text,
  -- What the guest should expect and when.
  response_target     text,

  quote_expires_at    timestamptz,
  converted_booking_id uuid references public.bookings (id) on delete set null,

  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now(),

  constraint enquiries_status_valid
    check (status in ('requested','under_review','quoted','awaiting_payment','confirmed','cancelled')),
  constraint enquiries_category_valid
    check (category in ('honeymoon','birthday','private_gathering')),
  constraint enquiries_attendance_non_negative
    check (attendance is null or attendance >= 0)
);

create index if not exists enquiries_status_idx  on public.enquiries (status);
create index if not exists enquiries_created_idx on public.enquiries (created_at desc);
create index if not exists enquiries_email_idx   on public.enquiries (lower(guest_email));

comment on column public.enquiries.internal_notes is
  'Staff only. Excluded from every guest-facing read path.';
comment on column public.enquiries.response_target is
  'The timeframe promised to the guest. Configured by the owner; never invented.';

-- Itemised quotes. Revisions are kept rather than overwritten so a guest can see
-- what changed and staff can audit it.
create table if not exists public.quotes (
  id                    uuid primary key default gen_random_uuid(),
  enquiry_id            uuid references public.enquiries (id) on delete cascade,
  booking_id            uuid references public.bookings (id) on delete cascade,
  reference             text not null unique default public.make_reference('QUO'),
  revision              integer not null default 1,

  currency              text not null default 'GHS',
  -- The itemised lines exactly as presented to the guest.
  lines                 jsonb not null default '[]'::jsonb,
  subtotal              numeric not null default 0,
  discount_total        numeric not null default 0,
  fees_total            numeric not null default 0,
  refundable_deposit    numeric not null default 0,
  total                 numeric not null default 0,
  due_now               numeric not null default 0,
  balance_due           numeric not null default 0,
  balance_due_date      date,

  status                text not null default 'sent',
  expires_at            timestamptz,
  accepted_at           timestamptz,
  accepted_by           text,

  policy_version        text,
  terms_snapshot        text,

  created_at            timestamptz not null default now(),

  constraint quotes_status_valid
    check (status in ('draft','sent','accepted','declined','expired','superseded')),
  constraint quotes_has_parent
    check (enquiry_id is not null or booking_id is not null)
);

create index if not exists quotes_enquiry_idx on public.quotes (enquiry_id);
create index if not exists quotes_status_idx  on public.quotes (status);

-- ---------------------------------------------------------------------------
-- 6. Activity log
-- ---------------------------------------------------------------------------

create table if not exists public.activity_log (
  id           bigserial primary key,
  entity_type  text not null,
  entity_id    text not null,
  action       text not null,
  actor        text,
  summary      text not null default '',
  detail       jsonb,
  created_at   timestamptz not null default now()
);

create index if not exists activity_log_entity_idx on public.activity_log (entity_type, entity_id, created_at desc);

-- ---------------------------------------------------------------------------
-- 7. Row-level security
-- ---------------------------------------------------------------------------
--
-- Guest access to an enquiry or quote is by reference through a server route
-- using the service-role key, exactly like /receipt/<reference>. Nothing here is
-- readable by the anonymous role, so a guest cannot enumerate other people's
-- requests even with the publishable key.

alter table public.accommodation_allocations enable row level security;
alter table public.inventory_holds        enable row level security;
alter table public.packages               enable row level security;
alter table public.package_extras         enable row level security;
alter table public.booking_extras         enable row level security;
alter table public.enquiries              enable row level security;
alter table public.quotes                 enable row level security;
alter table public.activity_log           enable row level security;

-- Published package definitions are public marketing content. Drafts are not.
drop policy if exists packages_public_read on public.packages;
create policy packages_public_read
  on public.packages for select
  using (status = 'published' or public.is_admin());

drop policy if exists packages_admin_write on public.packages;
create policy packages_admin_write
  on public.packages for all
  to authenticated
  using (public.is_admin()) with check (public.is_admin());

-- Extras of a published package are public. The EXISTS keeps a draft's extras
-- private.
drop policy if exists package_extras_public_read on public.package_extras;
create policy package_extras_public_read
  on public.package_extras for select
  using (
    public.is_admin()
    or exists (
      select 1 from public.packages p
       where p.id = package_extras.package_id and p.status = 'published'
    )
  );

drop policy if exists package_extras_admin_write on public.package_extras;
create policy package_extras_admin_write
  on public.package_extras for all
  to authenticated
  using (public.is_admin()) with check (public.is_admin());

-- Inventory, enquiries, quotes and the log are server-side only. No policy is
-- created for `anon` on purpose: with RLS enabled and no matching policy, the
-- anonymous role reads nothing. The routes use the service-role key.
do $$
declare
  t text;
begin
  foreach t in array array[
    'accommodation_allocations','inventory_holds','booking_extras',
    'enquiries','quotes','activity_log'
  ] loop
    execute format('drop policy if exists %I_admin_all on public.%I', t, t);
    execute format(
      'create policy %I_admin_all on public.%I for all to authenticated using (public.is_admin()) with check (public.is_admin())',
      t, t
    );
  end loop;
end $$;

-- ---------------------------------------------------------------------------
-- 8. Backfill existing rows
-- ---------------------------------------------------------------------------
--
-- Populates the new columns from data already present. Nothing is overwritten,
-- and no legacy `status` value is changed, so a booking that read "confirmed"
-- yesterday still reads "confirmed" through the old column.
--
-- A legacy confirmed booking that carried add-ons is deliberately recorded as
-- accommodation confirmed + occasion REQUESTED. Those add-ons were never priced
-- or approved — that is precisely the defect being fixed — so claiming them
-- confirmed would preserve the wrong claim rather than correct it.
--
-- READ THE COLUMN TYPES, DO NOT ASSUME THEM
--   `bookings.packages` is `text[]`, not `jsonb`. An earlier draft of this file
--   called jsonb_array_length(packages) and the whole migration aborted with
--   "function jsonb_array_length(text[]) does not exist" — which in the Supabase
--   SQL editor means nothing at all was applied, since it runs as one
--   transaction. `array_length(x, 1)` is the correct call, and its NULL for an
--   empty array is handled by the coalesce.
--
--   The same applies to any column this file touches that it does not itself
--   create. supabase/schema.sql is stale and cannot be used to infer types.

update public.bookings
   set accommodation_status = case status
                                when 'confirmed' then 'confirmed'
                                when 'cancelled' then 'cancelled'
                                else 'pending_payment'
                              end,
       occasion_status = case
                           when status = 'cancelled' then
                             case when coalesce(array_length(packages, 1), 0) > 0 then 'cancelled' else 'none' end
                           when coalesce(array_length(packages, 1), 0) > 0 then 'requested'
                           else 'none'
                         end
 where accommodation_status = 'pending_payment'
   and occasion_status = 'none';

-- DELIBERATELY NOT BACKFILLED: accommodation_unit_id.
--
-- Legacy rows recorded the guest's selection only as a free-text label inside
-- `packages`/the rate picker, and the label text changed between the two
-- bundled data files and production ("One bedrooms" vs "One bedroom apartment").
-- Guessing a unit id from a label would attach real bookings to the wrong
-- inventory and could make dates that are genuinely free look taken.
--
-- Instead, allocations are written from this migration forward, and a legacy row
-- is allocated lazily the first time staff touch it. Until then it still blocks
-- dates through the existing booking-availability check in
-- app/lib/availability.ts, so nothing is overbooked in the interim.

-- Seed the package catalogue as drafts so admin has rows to edit. `on conflict`
-- means re-running this file will not clobber anything an owner has configured.
insert into public.packages (slug, category, variant, name, summary, status, mode, price_basis)
values
  ('honeymoon',            'honeymoon',         'overnight',   'Honeymoon & Romantic Getaway',      'A private, quietly staged stay for two.',              'draft', 'quotation', 'quote'),
  ('birthday-room-setup',  'birthday',          'room_setup',  'Birthday Room Setup & Staycation',  'An overnight stay with the room prepared for a birthday.', 'draft', 'quotation', 'quote'),
  ('birthday-celebration', 'birthday',          'hosted_event','Birthday Celebration with Guests',  'A hosted birthday with additional attendees, quoted per event.', 'draft', 'quotation', 'quote'),
  ('private-gathering',    'private_gathering', 'day_event',   'Private Gathering & Casual Party',  'A private event at one of our properties, by approval.', 'draft', 'quotation', 'quote')
on conflict (slug) do nothing;

-- ---------------------------------------------------------------------------
-- 9. Verification
-- ---------------------------------------------------------------------------

-- Inventory guarantee present?
select conname, contype, pg_get_constraintdef(oid) as definition
  from pg_constraint
 where conname = 'accommodation_allocations_no_overlap';

-- Every booking should now sit on both tracks.
select status, accommodation_status, occasion_status, count(*) as bookings
  from public.bookings
 group by 1, 2, 3
 order by 1, 2, 3;

-- Packages, and what is still blocking instant booking.
select slug, category, status, mode, price_basis, amount,
       jsonb_array_length(inclusions)          as inclusions,
       jsonb_array_length(eligible_property_ids) as eligible_properties,
       max_guests, minimum_notice_days,
       case
         when status = 'published' and mode = 'fixed_price'
              and (amount is null or max_guests is null or minimum_notice_days is null
                   or cancellation_policy_id is null or jsonb_array_length(inclusions) = 0
                   or jsonb_array_length(eligible_property_ids) = 0)
           then 'BLOCKED'
         else 'ok'
       end as publish_state
  from public.packages
 order by category, slug;
