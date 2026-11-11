-- 2026-11-12-guest-verifications.sql
-- ---------------------------------------------------------------------------
-- Pre check-in records and their photographs.
--
-- One row per visit to /verify, keyed on a session id generated in the browser,
-- so the debounced auto-save updates the same row instead of creating a new
-- guest on every pause. `status` stays 'draft' until the guest presses Submit.
--
-- WRITE ACCESS
--
--   The form is public: a guest has no account. So anon may INSERT and UPDATE a
--   row, and may upload into the `verifications` bucket. Nothing is readable
--   anonymously — SELECT is limited to signed-in staff, so a guessed session id
--   cannot be used to read somebody else's name, number or photo.
--
--   `with check (true)` on insert is deliberate but narrow: without a login there
--   is no ownership to test. The mitigation is that the data cannot be read back,
--   and the bucket is private.
--
-- Run in Supabase -> SQL editor. Idempotent.
-- ---------------------------------------------------------------------------

create extension if not exists "pgcrypto";

create table if not exists public.guest_verifications (
  id uuid primary key default gen_random_uuid(),
  session_id text not null unique,
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
-- Photographs. Private bucket: row-level access, not a public URL.
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
