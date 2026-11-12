-- 2026-11-13-verification-form-fields.sql
-- ---------------------------------------------------------------------------
-- The /verify form now collects a full guest registration: contact details,
-- identification, stay dates and an optional emergency contact.
--
-- WHY THE COLUMNS ARE NULLABLE
--
--   The form autosaves while the guest types, so a row exists before the guest
--   has finished — every field has to be able to hold "not answered yet". The
--   required set is enforced in the page (and again on submit), not by NOT NULL,
--   because a NOT NULL here would break the first keystroke of the autosave.
--
--   `declared_accurate` and `accepted_rules` default to false for the same
--   reason: a draft has not agreed to anything yet, and `false` is the honest
--   value. Only an explicit tick sets them.
--
-- WHY photo_path IS NOT RENAMED
--
--   photo_path already holds the live selfie and the bucket layout keys on it.
--   The selfie is optional now, so it stays where it is; the ID document gets
--   its own column because the two are different evidence and must not be
--   confused when staff review a record.
--
-- Run in Supabase -> SQL editor. Idempotent.
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
-- Confirmation: report the shape of the table so a partial run is visible.
-- ---------------------------------------------------------------------------
select column_name, data_type
  from information_schema.columns
 where table_schema = 'public'
   and table_name = 'guest_verifications'
 order by ordinal_position;
