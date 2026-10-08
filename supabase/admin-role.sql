-- ===========================================================================
-- Cosy Crest — admin authorisation
--
-- Run this AFTER supabase/schema.sql, and only if you want the database itself
-- to enforce who is an administrator.
--
-- BACKGROUND — why this file exists
--   schema.sql grants the `authenticated` role unconditional access:
--
--     create policy "bookings_admin_all" on public.bookings
--       for all to authenticated using (true) with check (true);
--
--   On a project with public signup enabled, `authenticated` is not a synonym
--   for "admin" — it means "anyone who registered". With `disable_signup: false`
--   on the Supabase project, any stranger could:
--
--     POST /auth/v1/signup  →  confirm  →  sign in
--     GET  /rest/v1/bookings?select=guest_name,guest_email,guest_phone
--
--   …and read every guest's contact details, then edit prices and availability.
--
--   middleware.ts now blocks non-admins at the edge (see ADMIN_EMAILS). This
--   file is the second layer: it makes the *database* refuse too, so a mistake
--   in the gate, or a stray JWT, is not enough on its own.
--
-- WHAT IT DOES
--   1. Adds public.is_admin() — true only for an explicitly flagged user.
--   2. Re-points every admin policy from `authenticated` to `is_admin()`.
--
-- PREREQUISITES
--   1. Disable public signup:
--        Supabase Dashboard → Authentication → Sign In / Providers → Email
--        → turn OFF "Allow new users to sign up".
--   2. Create your admin user:
--        Supabase Dashboard → Authentication → Users → Add user.
--        Take note of the email address you use.
--   3. Set that same address in ADMIN_EMAILS in Vercel, so the middleware agrees.
--
--   EDIT the email in STEP 1 below before running.
-- ===========================================================================


-- ---------------------------------------------------------------------------
-- 1. Designate the administrator(s).
--
--    `raw_app_meta_data` is the Supabase-owned half of the user record. It is
--    the correct place for an authorisation claim because a client cannot write
--    to it — `supabase.auth.updateUser({ data: ... })` writes to
--    `user_metadata`, which is user-editable, and would let anyone promote
--    themselves.
--
--    Run one UPDATE per administrator.
-- ---------------------------------------------------------------------------

update auth.users
   set raw_app_meta_data =
         coalesce(raw_app_meta_data, '{}'::jsonb) || '{"role":"admin"}'::jsonb
 where lower(email) = lower('officialcosycrestaparts@gmail.com');

-- Verify it took. Expect exactly one row with role = admin.
select email, raw_app_meta_data ->> 'role' as role
  from auth.users
 where raw_app_meta_data ->> 'role' = 'admin';


-- ---------------------------------------------------------------------------
-- 2. The predicate the policies will call.
--
--    SECURITY DEFINER so it can read auth.users, which the calling role cannot.
--    `set search_path` pins the resolution order so the function cannot be
--    hijacked by a shadowing object in another schema.
--
--    STABLE, not VOLATILE: within a single statement the answer cannot change,
--    which lets Postgres avoid re-evaluating it per row.
-- ---------------------------------------------------------------------------

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public, auth
as $$
  select coalesce(
    (
      select u.raw_app_meta_data ->> 'role'
        from auth.users u
       where u.id = auth.uid()
    ) = 'admin',
    false
  );
$$;

-- Only signed-in callers need it; do not expose it to anon.
revoke all on function public.is_admin() from public, anon;
grant execute on function public.is_admin() to authenticated;


-- ---------------------------------------------------------------------------
-- 3. Re-point every admin policy at the role, not the role class.
--
--    Dropped first so this file is re-runnable, matching schema.sql's style.
-- ---------------------------------------------------------------------------

-- Properties: anyone may browse, only an admin may edit.
drop policy if exists "villas_admin_write" on public.villas;
create policy "villas_admin_write"
  on public.villas for all
  to authenticated
  using (public.is_admin()) with check (public.is_admin());

-- Blocked dates: anyone may read, only an admin may edit.
drop policy if exists "blocked_dates_admin_write" on public.blocked_dates;
create policy "blocked_dates_admin_write"
  on public.blocked_dates for all
  to authenticated
  using (public.is_admin()) with check (public.is_admin());

-- Bookings: guests may create one (server-side, via the service-role key, which
-- bypasses RLS); only an admin may read or change. This is the policy that stops
-- a self-registered account from reading guest contact details.
drop policy if exists "bookings_admin_all" on public.bookings;
create policy "bookings_admin_all"
  on public.bookings for all
  to authenticated
  using (public.is_admin()) with check (public.is_admin());

-- The public read policies are untouched and must stay:
--   villas_public_read        — guests browse listings without signing in
--   blocked_dates_public_read — the calendar greys dates out before login


-- ---------------------------------------------------------------------------
-- 4. Invoices, if the table exists — same guest PII, same treatment.
-- ---------------------------------------------------------------------------

do $$
begin
  if exists (
    select 1 from information_schema.tables
     where table_schema = 'public' and table_name = 'invoices'
  ) then
    execute 'drop policy if exists "invoices_admin_all" on public.invoices';
    execute 'create policy "invoices_admin_all" on public.invoices
               for all to authenticated
               using (public.is_admin()) with check (public.is_admin())';
  end if;
end $$;


-- ---------------------------------------------------------------------------
-- 5. Confirm the end state. Every admin policy should read is_admin(); every
--    public read policy should still read true.
-- ---------------------------------------------------------------------------

select
  c.relname                     as table_name,
  p.polname                     as policy,
  coalesce(p.polcmd::text, '—') as applies_to,
  pg_get_expr(p.polqual, p.polrelid)      as using_expression,
  pg_get_expr(p.polwithcheck, p.polrelid) as check_expression
from pg_class c
join pg_policy p on p.polrelid = c.oid
where c.relnamespace = 'public'::regnamespace
  and c.relname in ('villas', 'bookings', 'blocked_dates', 'invoices')
order by c.relname, p.polname;


-- ===========================================================================
-- VERIFICATION — run this AFTER applying, signed in as a NON-admin user.
--
--   With a fresh account's access token:
--     GET /rest/v1/bookings?select=guest_email
--   Expected: [] (no rows). Before this file it returned every guest's email.
--
--   As the admin account:
--     GET /rest/v1/bookings?select=guest_email
--   Expected: your real bookings.
--
-- If the non-admin still sees rows, `is_admin()` is returning true — check that
-- the JWT carries app_metadata.role, and that step 1 matched a real email.
-- ===========================================================================
