-- 2026-11-01-capacity-and-media.sql
-- ---------------------------------------------------------------------------
-- 1. Occupancy: three-bedroom houses take 6 guests, four-bedroom houses take 8.
--
--    Every row carried guests = 4, four-bedroom houses included, so a party of
--    five was refused at checkout on a house that sleeps eight. The figure is
--    also derived from the bedroom count on read (app/lib/capacity.ts), so a
--    stale row cannot bring the defect back — this migration makes the stored
--    data agree with what the site shows and what the owner sees in admin.
--
-- 2. Media: the clip labelled "Adenta Serenity walkthrough" is the Aburi studio.
--    It now lives at /aburi-studio.mp4 and is credited to the Aburi studio rate.
--    Adenta keeps no walkthrough — the asset is missing, and a missing asset is
--    reported rather than filled with another property's footage.
--
--    Nothing here guesses: the studio room appears inside /aburi.mp4 at 55–75s,
--    with the same wardrobe, butterfly canvas and blue carpet.
-- ---------------------------------------------------------------------------

-- ---- 1. Capacity ----------------------------------------------------------

update public.villas
   set guests = 8
 where bedrooms = 4
   and guests is distinct from 8;

update public.villas
   set guests = 6
 where bedrooms = 3
   and guests is distinct from 6;

-- ---- 2. Walkthrough reassignment ------------------------------------------

-- Aburi keeps the full-house tour.
update public.villas
   set video = '/aburi.mp4'
 where id = 2
   and video is distinct from '/aburi.mp4';

-- Adenta must not serve the Aburi studio clip.
update public.villas
   set video = null
 where id = 3
   and video in ('/adenta.mp4', '/aburi-studio.mp4');

-- The studio rate inside Aburi carries its own clip.
update public.villas
   set rates = (
         select jsonb_agg(
                  case
                    when lower(coalesce(entry ->> 'option', '')) = 'studio'
                      then entry || jsonb_build_object(
                             'video', '/aburi-studio.mp4',
                             'videoPoster', '/aburi-studio-poster.jpg'
                           )
                    else entry
                  end
                  order by ordinality
                )
           from jsonb_array_elements(rates) with ordinality as t(entry, ordinality)
       )
 where id = 2
   and jsonb_typeof(rates) = 'array'
   and exists (
         select 1
           from jsonb_array_elements(rates) as entry
          where lower(coalesce(entry ->> 'option', '')) = 'studio'
       );

-- ---- 3. Gallery row, when the gallery has been set up ---------------------
-- `gallery_media` only exists once 2026-10-30-gallery-and-deposits.sql has run.

do $$
begin
  if to_regclass('public.gallery_media') is not null then
    update public.gallery_media
       set src = '/aburi-studio.mp4',
           poster = '/aburi-studio-poster.jpg',
           villa_id = 2,
           title = 'Aburi Studio'
     where src = '/adenta.mp4';
  end if;
end $$;
