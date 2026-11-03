-- FIX-service-settings.sql
-- ---------------------------------------------------------------------------
-- Repairs Admin -> Services on its own, without re-running the whole script.
--
-- Run in Supabase -> SQL editor if the page says it cannot read or save
-- service_settings. Safe to run more than once.
--
-- What it guarantees:
--   • the table exists;
--   • the four copy columns exist (title, description, image, image_alt);
--   • the public can read it and a signed-in administrator can write it;
--   • the five approved cards are seeded, without overwriting your edits.
-- ---------------------------------------------------------------------------

create table if not exists public.service_settings (
  service_id text primary key,
  amount numeric(12, 2),
  active boolean not null default true,
  cta text not null default 'enquire',
  updated_at timestamptz not null default now()
);

alter table public.service_settings add column if not exists title text;
alter table public.service_settings add column if not exists description text;
alter table public.service_settings add column if not exists image text;
alter table public.service_settings add column if not exists image_alt text;
alter table public.service_settings add column if not exists sort_order integer default 999;

-- The `cta` check constraint is added separately: adding it inline fails if the
-- table already exists without it.
do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'service_settings_cta_valid'
  ) then
    alter table public.service_settings
      add constraint service_settings_cta_valid check (cta in ('book', 'enquire'));
  end if;
end $$;

alter table public.service_settings enable row level security;

-- Policies do not grant table privileges; without these the client cannot read.
grant usage on schema public to anon, authenticated;
grant select on public.service_settings to anon, authenticated;
grant insert, update, delete on public.service_settings to authenticated;

drop policy if exists "service settings are public to read" on public.service_settings;
create policy "service settings are public to read"
  on public.service_settings for select
  using (true);

drop policy if exists "authenticated can write service settings" on public.service_settings;
create policy "authenticated can write service settings"
  on public.service_settings for all
  to authenticated
  using (true)
  with check (true);

insert into public.service_settings (service_id, amount, active, cta) values
  ('honeymoon', 3500, true, 'book'),
  ('birthday', 5000, true, 'book'),
  ('car-rental', 1000, true, 'book'),
  ('massage', null, true, 'enquire'),
  ('private-chef', null, true, 'enquire')
on conflict (service_id) do nothing;

-- Confirmation: should return five rows and five column names.
select service_id, amount, active, cta, title, image
  from public.service_settings
 order by service_id;

select column_name
  from information_schema.columns
 where table_schema = 'public'
   and table_name = 'service_settings'
 order by ordinal_position;
