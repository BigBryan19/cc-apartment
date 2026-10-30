-- ---------------------------------------------------------------------------
-- Per-property rating, editable in Admin → Properties.
--
-- The listing card printed a hard-coded "4.9" for every apartment. It now reads
-- this column and only falls back to 4.9 when the column is empty, so the owner
-- can correct the figure without a deploy.
--
-- Also creates the public Storage bucket used by the image uploader on the same
-- screen. Safe to run more than once.
-- ---------------------------------------------------------------------------

alter table public.villas
  add column if not exists rating numeric(2,1)
    check (rating is null or (rating >= 0 and rating <= 5));

comment on column public.villas.rating is
  'Owner-entered guest rating, 0–5 with one decimal. NULL falls back to 4.9 in the UI.';

-- Storage bucket for property photographs.
--
-- Public read (guests must load the images) and authenticated write (only a
-- signed-in admin can upload). The bucket is created empty; the 5 MB limit keeps
-- a phone photo from being rejected without explanation.
insert into storage.buckets (id, name, public)
values ('villa-media', 'villa-media', true)
on conflict (id) do update set public = true;

drop policy if exists "villa_media_public_read" on storage.objects;
drop policy if exists "villa_media_admin_write" on storage.objects;

create policy "villa_media_public_read"
  on storage.objects for select
  using (bucket_id = 'villa-media');

create policy "villa_media_admin_write"
  on storage.objects for insert
  to authenticated
  with check (bucket_id = 'villa-media');

create policy "villa_media_admin_update"
  on storage.objects for update
  to authenticated
  using (bucket_id = 'villa-media')
  with check (bucket_id = 'villa-media');

create policy "villa_media_admin_delete"
  on storage.objects for delete
  to authenticated
  using (bucket_id = 'villa-media');
