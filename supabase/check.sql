-- ===========================================================================
-- Cosy Crest — "what does my project already have?" diagnostic
--
-- Read-only. Paste into Supabase Dashboard > SQL Editor > New query and Run.
-- Nothing is created, changed or deleted.
--
-- Use this before running schema.sql on an existing project, so you can see
-- whether you are starting clean or upgrading tables that are already there.
-- ===========================================================================


-- ---------------------------------------------------------------------------
-- 1. Which of the three tables exist, and how many rows do they hold?
--    Emitted as notices — check the "Results" / "Notices" panel of the editor.
-- ---------------------------------------------------------------------------
do $$
declare
  t text;
  n bigint;
begin
  foreach t in array array['villas', 'bookings', 'blocked_dates']
  loop
    if exists (
      select 1 from information_schema.tables
      where table_schema = 'public' and table_name = t
    ) then
      execute format('select count(*) from public.%I', t) into n;
      raise notice 'EXISTS : public.% — % row(s)', t, n;
    else
      raise notice 'MISSING: public.%', t;
    end if;
  end loop;
end $$;


-- ---------------------------------------------------------------------------
-- 2. Every column on those tables. Compare against the list in schema.sql to
--    spot anything missing.
-- ---------------------------------------------------------------------------
select
  table_name,
  ordinal_position as pos,
  column_name,
  data_type,
  is_nullable
from information_schema.columns
where table_schema = 'public'
  and table_name in ('villas', 'bookings', 'blocked_dates')
order by table_name, ordinal_position;


-- ---------------------------------------------------------------------------
-- 3. The type of villas.id — this matters.
--
--    The app links to properties as /villas/<id>, and the detail page looks
--    the property up in the bundled catalogue by NUMERIC id (1, 2, 3). If your
--    villas.id is a uuid, those links will not resolve and the detail page
--    will report "Villa not found".
-- ---------------------------------------------------------------------------
select
  column_name,
  data_type,
  column_default
from information_schema.columns
where table_schema = 'public'
  and table_name = 'villas'
  and column_name = 'id';


-- ---------------------------------------------------------------------------
-- 4. Is Row Level Security on, and which policies already exist?
-- ---------------------------------------------------------------------------
select
  c.relname                     as table_name,
  c.relrowsecurity              as rls_enabled,
  coalesce(p.polname, '—')      as policy,
  -- polcmd is one of r (select) / a (insert) / w (update) / d (delete) / * (all)
  coalesce(p.polcmd::text, '—') as applies_to
from pg_class c
left join pg_policy p on p.polrelid = c.oid
where c.relnamespace = 'public'::regnamespace
  and c.relname in ('villas', 'bookings', 'blocked_dates')
order by c.relname, p.polname;
