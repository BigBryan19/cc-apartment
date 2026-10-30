# Cosy Crest — website update, 30 October 2026

What changed, what is still needed from you, and how each item was checked.

---

## 1. Destination images

| Card | Before | Now |
|---|---|---|
| Eastern Region | Unsplash landscape, not Ghana | `/Aburi2.jpeg` — the living room at Aburi Mountain Retreat |
| Greater Accra | Unsplash coastal scene, not Ghana | `/Adenta1.jpg` — the exterior of Adenta Serenity |

Both are **your own property photographs**, and the section now states that the
photographs show our apartments rather than implying they are regional
landscapes.

Two other foreign images were found and removed while checking for the same
problem:

- `og-cover.jpg` (the social-share image, used on 12 pages) was an AI-generated
  clifftop villa, not a Cosy Crest property. Regenerated at 1200×630 from
  `Adenta1.jpg`.
- `pool.jpg` on the "Become a host" panel was a stock Mediterranean pool.
  Replaced with `Adenta2.jpg`, our own pool terrace at Adenta.

**Still needed:** one photograph of the Aburi hills or the Aburi road for the
Eastern Region card, and a wider shot of the Lakeside Estate surroundings. The
current cards are accurate but they are interiors/exteriors of the apartments,
not views of the region.

---

## 2. Experiences and services

| Service | Price shown | Charged by the booking engine | Image |
|---|---|---|---|
| Honeymoon & Couples | From GHS 3,500 per stay | Yes — `honeymoon-setup` extra, per stay | `/Adenta4.jpg` (a prepared bedroom) |
| Birthday Celebrations | From GHS 5,000 per stay | Yes — `birthday-decoration` extra, per stay | `/Adenta3.jpg` |
| Car Rental | GHS 1,000 per day | Yes — `car-rental` extra, per day | `/car-rental-tucson.jpg` |
| Massage Services | Enquire for pricing | No price — quotation only | `/massage-service.jpg` |

- The old cards said "From GHS 500" and showed a sports car at "GHS 350 per
  day". Both are gone. Prices now come from `app/lib/services.ts`, and the two
  priced services are mirrored in `app/lib/extras.ts` so a card cannot advertise
  a figure the checkout will not charge.
- Rental total is computed from the picked dates: **chargeable days × GHS 1,000**
  (`app/components/services/CarRentalCalculator.tsx`).
- Every enquiry button opens WhatsApp with the service named, and for car rental
  with the dates, day count and estimated total prefilled.
- Birthday experience videos are supported by the gallery's video player.

**Image note:** the Tucson photograph is a real, freely-licensed press-style
photograph of the model. The number plate is not Ghanaian. Replace it with a
photograph of your actual rental vehicle when you have one. The massage image is
a real treatment-room photograph, not an AI image, but it is a placeholder for
your own treatment setup.

**WhatsApp number fixed:** `contact.ts` kept the trunk `0` after the country code
(`233` + `054…`), producing a number WhatsApp does not recognise. Corrected to
`233540534870`.

---

## 3. Media & Gallery

- A full page at `/gallery`, linked from the header and footer. It is **not** on
  the home page — the home page stays focused on stays and services.
- Filters: **All, Stays, Birthdays, Couples, Other Experiences**, with counts.
- Photos open in a lightbox with keyboard and arrow navigation; videos open in a
  `<video controls>` player and never autoplay audio.
- **Every image of every apartment is in the gallery** — 12 photographs across
  the three properties, plus their three walkthrough videos. The villa pages
  also show all of a property's own images: the mosaic previously hid the extra
  tiles on mobile (`hidden md:block`), so a phone visitor saw one photo and never
  knew the rest existed. That is fixed.
- Video tiles use a poster frame plus a play badge, so the grid costs one
  thumbnail per video rather than three half-downloaded files.
- Owner-managed: **/admin/gallery** adds, categorises, reorders (up/down) and
  removes media, stored in `gallery_media`.

**Birthdays, Couples and Other Experiences are empty on purpose.** There is no
media for them in the project, and the brief forbids inventing guest
experiences. Those filters show an honest message instead.

**Needed from you:** photographs of a birthday setup, a honeymoon setup, and any
guest-experience footage. Once provided they can be added from the admin screen
without a deploy.

---

## 4. Booking dates

- Two fields, explicitly labelled **"Select check-in date"** and **"Select
  check-out date"**, side by side on desktop and stacked on mobile.
- Past check-in dates are blocked (`min` on the input, and the server rejects
  them), check-out must be after check-in, and choosing a check-in on or after
  the current check-out clears the check-out instead of leaving an invalid pair.
- The night count updates immediately, and the total follows it.
- Availability is still enforced: blocked and booked dates remain visible in the
  optional "Check availability" calendar, and any conflict is reported before
  the guest can continue.
- Car rental uses **"Pickup date"** and **"Return date"** and shows chargeable
  days.

---

## 5. Flexible payments and deposits

- Checkout offers **"Pay in full"** and **"Part payment"**. Nothing is sent to
  your team — the guest completes the part payment on the same screen.
- **Part payment is live by default at a 30% minimum.** The guest moves a slider
  between 30% and 99%, sees the exact amount for their choice, and pays the
  balance before arrival. 100% is simply "pay in full".
- The owner can raise the floor above 30%, or switch part payment off entirely,
  in **Admin → Settings → Deposit policy**. A stored floor below 30% is raised to
  30% — the business rule cannot be undercut by a settings row.
- Before payment the summary shows: booking total, deposit due now, outstanding
  balance, and the balance deadline/instructions.
- Server-side, the amount to charge is computed from trusted pricing records and
  the stored policy — never from the request body.
- A deposit is recorded as `payment_status = "partially_paid"` with the balance
  in `balance_due`, while `status` stays `confirmed`. Booking state and money
  state are separate columns on purpose.
- Repeated attempts reuse an unpaid booking for the same property, unit, dates
  and email created in the last 30 minutes, so a double tap or a retry does not
  create two reservations.

**Run this SQL before enabling deposits:** `supabase/migrations/2026-10-30-gallery-and-deposits.sql`.
Without it the booking still saves (the API retries without the deposit columns)
but the deposit figures are not stored.

---

## 6. Villa-by-villa media checklist

| Villa | Photos | Listing video preview | Detail-page video | Missing coverage |
|---|---|---|---|---|
| **Lakeside Estate** (id 1) | 4 — `Lake2` courtyard, `Lake4` living room, `Lake3` pool terrace, `Lake1` games room | ✅ `lakeside.mp4` (autoplay muted, poster fallback) | ✅ controls + lightbox | No bedroom, no bathroom, no kitchen |
| **Aburi Mountain Retreat** (id 2) | 4 — `Aburi1` bedroom, `Aburi2` living room, `Aburi3` bar, `Aburi4` kitchen | ✅ `aburi.mp4` | ✅ controls + lightbox | No bathroom, no exterior |
| **Adenta Serenity** (id 3) | 4 — `Adenta1` exterior, `Adenta2` pool, `Adenta3` living/dining, `Adenta4` bedroom | ✅ `adenta.mp4` | ✅ controls + lightbox | No bathroom, no kitchen |

**Why the previews stopped working:** commit `a8af45f` ("drop 56 MB of unused
assets") deleted `aburi.mp4`, `adenta.mp4` and `lakeside.mp4` from `public/`.
Nothing was wrong with the code — the files were gone. They have been restored
from git history.

**Also fixed:** the Lakeside gallery pointed at `/Lakeside1.jpg`…`/Lakeside4.jpg`.
The files on disk are `Lake1–4.jpg`, so those images were 404ing.

**Every image is matched to its own property.** No photograph or video is reused
across villas.

**Needed:** bathroom photographs for all three, a kitchen for Lakeside and
Adenta, an exterior for Aburi, and a bedroom for Lakeside. Roughly 4–6 more
photographs per villa would complete the set the brief describes.

---

## 7. Checks run

- `npm run build` — compiles and prerenders all 3 villa pages, `/gallery`,
  `/packages`, `/checkout`, `/admin/gallery`, `/admin/settings`.
- `npm run test:pricing` — **74 checks pass** (51 pricing/status + 23 new deposit
  and rental-day checks).
- Route smoke test against a production build: `/`, `/packages`, `/gallery`,
  `/villas/2`, `/checkout`, `/admin/gallery`, `/admin/settings` all return 200.

**Not verified in a real browser** (no browser session in this environment):
autoplay behaviour on a physical phone, WhatsApp deep links opening the app, and
a live deposit payment against Payaza. Those need one pass on a real device.

---

## 8. Credentials and settings needed

1. `SUPABASE_SERVICE_ROLE_KEY` in Vercel — without it a paid booking cannot be
   recorded and the success screen shows the amber "we are checking" state.
2. Run the migration above in the Supabase SQL editor.
3. Set the deposit policy in Admin → Settings, if you want deposits live.
4. Replace the Tucson and massage photographs with your own when available.
