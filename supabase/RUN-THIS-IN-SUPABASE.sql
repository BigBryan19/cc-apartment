-- RUN-THIS-IN-SUPABASE.sql
-- ===========================================================================
-- Guest registration (/verify) — one file, run once.
--
-- WHY YOU NEED THIS
--
--   Until this runs, every visit to /verify ends with
--
--     new row violates row-level security policy for table "guest_verifications"
--
--   That is Postgres refusing the insert because the table has row-level
--   security switched on but no policy that allows an anonymous guest to write
--   to it. The table existing is not enough — a policy has to allow the insert,
--   and the `anon` role needs a grant on the table.
--
-- HOW TO RUN IT
--
--   1. Supabase dashboard -> SQL Editor -> New query
--   2. Paste this entire file
--   3. Run
--   4. You should get a final table listing every column. If you see
--      `declared_accurate` and `accepted_rules` in that list, it worked.
--
-- Safe to run more than once: every statement is idempotent (create if not
-- exists, drop policy if exists, add column if not exists).
-- ===========================================================================

-- ---------------------------------------------------------------------------
-- 1. Schema
-- ---------------------------------------------------------------------------

create extension if not exists "pgcrypto";

create table if not exists public.guest_verifications (
  id uuid primary key default gen_random_uuid(),
  session_id text not null unique,
  booking_reference text,
  full_name text,
  contact_number text,
  email text,
  photo_path text,
  status text not null default 'draft' check (status in ('draft', 'submitted', 'verified')),
  booking_id uuid,
  note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.guest_verifications
  add column if not exists booking_reference text;

create index if not exists guest_verifications_reference_idx
  on public.guest_verifications (booking_reference);

create index if not exists guest_verifications_status_idx
  on public.guest_verifications (status, created_at desc);

alter table public.guest_verifications enable row level security;

drop policy if exists "guests can create a verification" on public.guest_verifications;
create policy "guests can create a verification"
  on public.guest_verifications for insert
  to anon, authenticated
  with check (true);

drop policy if exists "guests can update their verification" on public.guest_verifications;
create policy "guests can update their verification"
  on public.guest_verifications for update
  to anon, authenticated
  using (true)
  with check (true);

drop policy if exists "staff can read verifications" on public.guest_verifications;
create policy "staff can read verifications"
  on public.guest_verifications for select
  to authenticated
  using (true);

drop policy if exists "staff can change verifications" on public.guest_verifications;
create policy "staff can change verifications"
  on public.guest_verifications for delete
  to authenticated
  using (true);

-- Grants: policies alone do not give a role access to the table.
grant insert, update on public.guest_verifications to anon;
grant select, insert, update, delete on public.guest_verifications to authenticated;

-- ---------------------------------------------------------------------------
-- 3. Photographs. Private bucket: row-level access, not a public URL.
-- ---------------------------------------------------------------------------
insert into storage.buckets (id, name, public)
values ('verifications', 'verifications', false)
on conflict (id) do nothing;

drop policy if exists "guests can upload verification photos" on storage.objects;
create policy "guests can upload verification photos"
  on storage.objects for insert
  to anon, authenticated
  with check (bucket_id = 'verifications');

drop policy if exists "staff can read verification photos" on storage.objects;
create policy "staff can read verification photos"
  on storage.objects for select
  to authenticated
  using (bucket_id = 'verifications');

drop policy if exists "staff can remove verification photos" on storage.objects;
create policy "staff can remove verification photos"
  on storage.objects for delete
  to authenticated
  using (bucket_id = 'verifications');

-- ---------------------------------------------------------------------------
-- Confirmation.
-- ---------------------------------------------------------------------------
select table_name from information_schema.tables
 where table_schema = 'public' and table_name = 'guest_verifications';

select id, public from storage.buckets where id = 'verifications';


-- ---------------------------------------------------------------------------
-- 2. Columns added by the six-page form
-- ---------------------------------------------------------------------------

alter table public.guest_verifications
  add column if not exists whatsapp_number text,
  add column if not exists id_type text,
  add column if not exists id_photo_path text,
  add column if not exists check_in_date date,
  add column if not exists check_out_date date,
  add column if not exists guests_count integer,
  add column if not exists emergency_name text,
  add column if not exists emergency_relationship text,
  add column if not exists emergency_phone text,
  add column if not exists declared_accurate boolean not null default false,
  add column if not exists accepted_rules boolean not null default false,
  add column if not exists submitted_at timestamptz;

-- Identification is one of three documents. A check constraint rather than an
-- enum: the list is short, and adding a fourth document type should not need a
-- type migration. `is null` is allowed so drafts save.
alter table public.guest_verifications
  drop constraint if exists guest_verifications_id_type_check;
alter table public.guest_verifications
  add constraint guest_verifications_id_type_check
  check (id_type is null or id_type in ('ghana_card', 'passport', 'drivers_licence'));

-- One guest is the minimum: a registration with zero people is not a stay.
-- The upper bound matches the largest approved occupancy so a typo of 400
-- cannot be stored.
alter table public.guest_verifications
  drop constraint if exists guest_verifications_guests_count_check;
alter table public.guest_verifications
  add constraint guest_verifications_guests_count_check
  check (guests_count is null or (guests_count >= 1 and guests_count <= 40));

-- A stay cannot end before it begins. Both dates are nullable for drafts, and
-- the comparison short-circuits on the first null.
alter table public.guest_verifications
  drop constraint if exists guest_verifications_dates_check;
alter table public.guest_verifications
  add constraint guest_verifications_dates_check
  check (
    check_in_date is null
    or check_out_date is null
    or check_out_date >= check_in_date
  );

-- Staff review reads the queue newest-first by status, and looks a guest up by
-- the reference on their confirmation.
create index if not exists guest_verifications_submitted_idx
  on public.guest_verifications (submitted_at desc nulls last);




-- ---------------------------------------------------------------------------
-- 4. Belt and braces
-- ---------------------------------------------------------------------------

-- Policies do not imply table privileges.
grant usage on schema public to anon, authenticated;
grant insert, update on public.guest_verifications to anon;
grant select, insert, update, delete on public.guest_verifications to authenticated;

-- If the table was created by hand in the dashboard it may have RLS on with no
-- policy at all. Re-state the two write policies so this file is the fix either
-- way.
alter table public.guest_verifications enable row level security;

drop policy if exists "guests can create a verification" on public.guest_verifications;
create policy "guests can create a verification"
  on public.guest_verifications for insert
  to anon, authenticated
  with check (true);

drop policy if exists "guests can update their verification" on public.guest_verifications;
create policy "guests can update their verification"
  on public.guest_verifications for update
  to anon, authenticated
  using (true)
  with check (true);

-- ---------------------------------------------------------------------------
-- 5. Did it work?
-- ---------------------------------------------------------------------------

select column_name, data_type
  from information_schema.columns
 where table_schema = 'public'
   and table_name = 'guest_verifications'
 order by ordinal_position;

select policyname, cmd, roles
  from pg_policies
 where schemaname = 'public' and tablename = 'guest_verifications'
 order by policyname;

select id, public from storage.buckets where id = 'verifications';
