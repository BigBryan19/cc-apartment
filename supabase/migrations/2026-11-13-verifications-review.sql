-- 2026-11-13-verifications-review.sql
-- ---------------------------------------------------------------------------
-- Staff review of guest registrations.
--
-- WHAT THIS ADDS
--
--   `rejected` as a fourth status, plus the reason it was rejected and when a
--   human last touched the record. Without a rejected state the only honest
--   options were "submitted" (a blurry Ghana Card sitting in the queue for
--   ever) or deleting the row, which throws away the fact that somebody
--   presented a document the property did not accept.
--
-- WHY rejection_reason IS FREE TEXT
--
--   It is read by staff, at a desk, seconds after clicking Reject. A closed list
--   of reasons ("expired", "blurry", "mismatch") would be tidier to query and
--   worse to use: the reason someone actually writes — "name on card does not
--   match the booking" — is the one that helps the next person.
--
-- WHY booking_reference STAYS
--
--   The guest-facing form no longer asks for it. Staff assign it here instead,
--   after looking the reservation up, so the verification can be tied to the
--   booking it belongs to. The column already exists from 2026-11-12; the
--   add-if-not-exists below is only so this file can run on its own.
--
-- Run in Supabase -> SQL editor. Idempotent.
-- ---------------------------------------------------------------------------

-- The old constraint only allowed draft/submitted/verified.
alter table public.guest_verifications
  drop constraint if exists guest_verifications_status_check;

alter table public.guest_verifications
  add constraint guest_verifications_status_check
  check (status in ('draft', 'submitted', 'verified', 'rejected'));

alter table public.guest_verifications
  add column if not exists booking_reference text,
  add column if not exists rejection_reason text,
  add column if not exists reviewed_at timestamptz;

-- The queue is read as "everything I have not dealt with yet", which is
-- submitted-first. This index keeps that ordered scan cheap as rows accumulate.
create index if not exists guest_verifications_review_idx
  on public.guest_verifications (status, submitted_at desc nulls last);

-- Abandoned drafts are swept by age, so the sweep needs the column indexed.
create index if not exists guest_verifications_updated_idx
  on public.guest_verifications (updated_at);

-- Staff update records through the ordinary authenticated policy created in
-- 2026-11-12. Restated here so a run of this file alone is still complete.
grant insert, update on public.guest_verifications to anon;
grant select, insert, update, delete on public.guest_verifications to authenticated;

-- ---------------------------------------------------------------------------
-- Confirmation: the status constraint must now list four values.
-- ---------------------------------------------------------------------------
select conname, pg_get_constraintdef(oid) as definition
  from pg_constraint
 where conrelid = 'public.guest_verifications'::regclass
   and contype = 'c'
 order by conname;

select column_name, data_type
  from information_schema.columns
 where table_schema = 'public'
   and table_name = 'guest_verifications'
   and column_name in ('rejection_reason', 'reviewed_at', 'booking_reference')
 order by column_name;
