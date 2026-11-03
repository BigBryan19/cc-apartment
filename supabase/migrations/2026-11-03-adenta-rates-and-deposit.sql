-- 2026-11-03-adenta-rates-and-deposit.sql
-- ---------------------------------------------------------------------------
-- Adenta Serenity: correct rate list, and the deposit floor.
--
-- The stored `rates` array still held a Studio row (GHS 600) copied from Aburi.
-- Adenta has no studio, and the approved nightly figures are:
--     1 bedroom          2,000
--     2 bedrooms         2,500
--     entire 4-bedroom   4,000
--     party              6,000
--
-- The application already refuses to sell that stored list — a rate that prices
-- a room the house does not have is treated as stale, not as a price choice —
-- but this migration fixes the data so Admin → Properties shows what the site
-- actually sells.
--
-- Run this in Supabase → SQL editor. It is idempotent.
-- ---------------------------------------------------------------------------

update public.villas
   set rates = '[
     {"option": "One bedroom", "amount": 2000, "priceBasis": "per_night", "maxGuests": 2},
     {"option": "Two bedrooms", "amount": 2500, "priceBasis": "per_night", "maxGuests": 4},
     {"option": "Whole apartment (4 bedrooms)", "amount": 4000, "priceBasis": "per_night"},
     {"option": "Monthly Rate (Whole apartment)", "amount": null, "priceBasis": "monthly"},
     {"option": "Special Party Rate", "amount": 6000, "priceBasis": "per_stay"},
     {"option": "Test Room", "amount": 1, "priceBasis": "per_stay", "maxGuests": 60}
   ]'::jsonb
 where id = 3;

-- Lakeside is a three-bedroom apartment at 3,500 per night; its monthly rate is
-- now an enquiry rather than a published figure.
update public.villas
   set guests = 6,
       bedrooms = 3,
       price = 3500
 where id = 1;

update public.villas
   set rates = jsonb_set(
         rates,
         '{4,amount}',
         'null'::jsonb,
         false
       )
 where id = 1
   and jsonb_typeof(rates) = 'array'
   and lower(coalesce(rates -> 4 ->> 'option', '')) like '%monthly%';

-- Every property: no published monthly figure, on any row.
update public.villas
   set rates = (
     select jsonb_agg(
              case
                when lower(coalesce(entry ->> 'option', '')) like '%monthly%'
                  then entry || jsonb_build_object('amount', null)
                else entry
              end
              order by ordinality
            )
       from jsonb_array_elements(rates) with ordinality as t(entry, ordinality)
   )
 where jsonb_typeof(rates) = 'array'
   and exists (
     select 1 from jsonb_array_elements(rates) as entry
      where lower(coalesce(entry ->> 'option', '')) like '%monthly%'
        and entry ->> 'amount' is not null
   );

-- Adenta keeps some of the seventeen supplied photographs; the rest are added
-- through Admin → Properties so the owner controls the order.
