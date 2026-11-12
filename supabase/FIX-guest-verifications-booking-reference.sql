-- FIX-guest-verifications-booking-reference.sql
-- ---------------------------------------------------------------------------
-- Adds the booking reference to pre check-in records.
--
-- Run this if you already created guest_verifications before 12 November 2026;
-- the column is what lets a verification be reconciled with the reservation it
-- belongs to. Safe to run more than once.
-- ---------------------------------------------------------------------------

alter table public.guest_verifications
  add column if not exists booking_reference text;

create index if not exists guest_verifications_reference_idx
  on public.guest_verifications (booking_reference);

-- Confirmation: the column should be listed.
select column_name, data_type
  from information_schema.columns
 where table_schema = 'public'
   and table_name = 'guest_verifications'
 order by ordinal_position;
