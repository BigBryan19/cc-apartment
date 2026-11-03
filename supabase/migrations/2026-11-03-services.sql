-- 2026-11-03-services.sql
-- ---------------------------------------------------------------------------
-- Owner control for the Experiences & services cards.
--
-- Each row overrides one card: whether it is shown, its price, and whether its
-- button adds the service to a stay or opens a WhatsApp enquiry. With no row,
-- the approved figures in app/lib/services.ts apply — so an empty table is safe.
--
-- Run in Supabase → SQL editor. Idempotent.
-- ---------------------------------------------------------------------------

create table if not exists public.service_settings (
  service_id text primary key,
  -- Major units, GHS. Null means the service is unpriced ("Enquire for pricing").
  amount numeric(12, 2),
  active boolean not null default true,
  cta text not null default 'enquire' check (cta in ('book', 'enquire')),
  updated_at timestamptz not null default now()
);

-- Card copy and photograph, added after the first version of this table.
alter table public.service_settings add column if not exists title text;
alter table public.service_settings add column if not exists description text;
alter table public.service_settings add column if not exists image text;
alter table public.service_settings add column if not exists image_alt text;

comment on table public.service_settings is
  'Per-card settings for the experiences & services section, edited at /admin/services.';

alter table public.service_settings enable row level security;

-- Anyone may read (the public services section needs it); only signed-in
-- administrators may change it. The admin gate itself is enforced in
-- middleware.ts, which requires ADMIN_EMAILS or app_metadata.role = 'admin'.
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

-- Seed the approved figures, so Admin → Services opens with real values rather
-- than blanks. These match app/lib/services.ts at the time of writing.
insert into public.service_settings (service_id, amount, active, cta) values
  ('honeymoon', 3500, true, 'book'),
  ('birthday', 5000, true, 'book'),
  ('car-rental', 1000, true, 'book'),
  ('massage', null, true, 'enquire'),
  ('private-chef', null, true, 'enquire')
on conflict (service_id) do nothing;
