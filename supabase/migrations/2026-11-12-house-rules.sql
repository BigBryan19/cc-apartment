-- 2026-11-12-house-rules.sql
-- ---------------------------------------------------------------------------
-- House rules shown on /verify and editable in Admin -> House rules.
--
-- Kept in their own table rather than inside site_settings so the manager can
-- add, reorder and delete individual rules without rewriting one JSON blob.
--
-- Run in Supabase -> SQL editor. Idempotent.
-- ---------------------------------------------------------------------------

create table if not exists public.house_rules (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  body text,
  active boolean not null default true,
  sort_order integer not null default 100,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists house_rules_order_idx
  on public.house_rules (active, sort_order);

alter table public.house_rules enable row level security;

drop policy if exists "house rules are public" on public.house_rules;
create policy "house rules are public"
  on public.house_rules for select
  using (true);

drop policy if exists "staff manage house rules" on public.house_rules;
create policy "staff manage house rules"
  on public.house_rules for all
  to authenticated
  using (true)
  with check (true);

grant select on public.house_rules to anon;
grant select, insert, update, delete on public.house_rules to authenticated;

-- Starter rules. Edit or delete them in Admin -> House rules; ON CONFLICT keeps
-- any wording the owner has already changed.
insert into public.house_rules (title, body, sort_order) values
  ('Check-in and check-out', 'Check-in from 3pm, check-out by 11am. Tell us your arrival time so someone is there.', 10),
  ('No smoking indoors', 'Smoking is allowed outside only. A cleaning charge applies if smoking happens inside.', 20),
  ('Quiet hours', 'Please keep noise down between 10pm and 7am out of respect for neighbours.', 30),
  ('Guests and visitors', 'Only the guests named on the booking may stay overnight. Day visitors must be signed in.', 40),
  ('Parties', 'Parties and events must be booked as a party package in advance, not held as a surprise.', 50)
on conflict do nothing;

select title, sort_order from public.house_rules order by sort_order;
