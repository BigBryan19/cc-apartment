-- RUN-THIS-IN-SUPABASE.sql
-- ===========================================================================
-- Guest registration (/verify) — one file, run once.
--
-- WHAT IS WRONG RIGHT NOW
--
--   Verified against your project on 13 Nov: the table has every column the
--   form writes, but an anonymous insert is still refused with
--
--     42501  new row violates row-level security policy for table
--            "guest_verifications"
--
--   So the *columns* migration ran and the *policies* migration did not. The
--   table has row-level security switched on and no policy that lets a guest
--   write to it. A table existing is not enough: a policy has to allow the
--   insert, and the `anon` role needs a grant on the table.
--
-- HOW TO RUN IT
--
--   1. Supabase dashboard -> SQL Editor -> New query
--   2. Paste this entire file
--   3. Run
--   4. The last three queries print the columns, the policies and the bucket.
--      You want to see `guests can create a verification` in the policy list.
--
-- DESIGNED NOT TO FAIL PARTWAY
--
--   The SQL editor stops at the first statement that raises an error, which is
--   the most likely reason the policies never landed last time: `create
--   extension` is refused on some plans and everything after it is skipped.
--   This file therefore creates no extensions, puts the policies early, and
--   wraps the storage setup so a bucket problem cannot take the table with it.
--
-- Safe to run repeatedly: every statement is idempotent.
-- ===========================================================================


-- ---------------------------------------------------------------------------
-- 1. The table, if it does not exist yet
-- ---------------------------------------------------------------------------

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


-- ---------------------------------------------------------------------------
-- 2. Every column the six-page form writes
--
--    Nullable on purpose. The form autosaves while the guest types, so a row
--    exists before they have finished; the required set is enforced in the page,
--    not by NOT NULL, which would break the first keystroke of the autosave.
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


-- ---------------------------------------------------------------------------
-- 3. The part that has been missing — write access for a guest
--
--    A guest has no account, so `anon` must be able to INSERT and UPDATE. It is
--    deliberately not able to SELECT: a guessed session id must not be a way to
--    read somebody else's name, number or photograph.
-- ---------------------------------------------------------------------------

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

-- A policy is not a privilege. Without these grants the role is still refused.
grant usage on schema public to anon, authenticated;
grant insert, update on public.guest_verifications to anon;
grant select, insert, update, delete on public.guest_verifications to authenticated;


-- A policy left behind by an earlier attempt can be RESTRICTIVE, which ANDs
-- with the permissive ones above and quietly keeps blocking writes. Nothing in
-- the app creates one, but if the table was hand-built it is worth clearing.
do $$
declare leftover record;
begin
  for leftover in
    select policyname from pg_policies
     where schemaname = 'public'
       and tablename = 'guest_verifications'
       and permissive = 'RESTRICTIVE'
  loop
    execute format('drop policy if exists %I on public.guest_verifications', leftover.policyname);
    raise notice 'Dropped restrictive policy %', leftover.policyname;
  end loop;
end $$;


-- ---------------------------------------------------------------------------
-- 4. Constraints and indexes
-- ---------------------------------------------------------------------------

alter table public.guest_verifications
  drop constraint if exists guest_verifications_id_type_check;
alter table public.guest_verifications
  add constraint guest_verifications_id_type_check
  check (id_type is null or id_type in ('ghana_card', 'passport', 'drivers_licence'));

alter table public.guest_verifications
  drop constraint if exists guest_verifications_guests_count_check;
alter table public.guest_verifications
  add constraint guest_verifications_guests_count_check
  check (guests_count is null or (guests_count >= 1 and guests_count <= 40));

alter table public.guest_verifications
  drop constraint if exists guest_verifications_dates_check;
alter table public.guest_verifications
  add constraint guest_verifications_dates_check
  check (
    check_in_date is null
    or check_out_date is null
    or check_out_date >= check_in_date
  );

create index if not exists guest_verifications_reference_idx
  on public.guest_verifications (booking_reference);
create index if not exists guest_verifications_status_idx
  on public.guest_verifications (status, created_at desc);
create index if not exists guest_verifications_submitted_idx
  on public.guest_verifications (submitted_at desc nulls last);


-- ---------------------------------------------------------------------------
-- 5. Photographs — private bucket, row-level access, no public URL
--
--    Wrapped, so that a bucket permission problem cannot abort the policies
--    above. If this block raises a notice instead, create the bucket by hand:
--    Storage -> New bucket -> name `verifications` -> Public: off.
-- ---------------------------------------------------------------------------

do $$
begin
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
exception
  when others then
    raise notice 'Storage setup skipped: %', sqlerrm;
end $$;


-- ---------------------------------------------------------------------------
-- 6. Did it work?
--
--    Look for `guests can create a verification` in the second result. If it is
--    there, /verify saves.
-- ---------------------------------------------------------------------------

select column_name, data_type
  from information_schema.columns
 where table_schema = 'public'
   and table_name = 'guest_verifications'
 order by ordinal_position;

select policyname, cmd, permissive, roles
  from pg_policies
 where schemaname = 'public' and tablename = 'guest_verifications'
 order by policyname;

select id, public from storage.buckets where id = 'verifications';
