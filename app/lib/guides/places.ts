// app/lib/guides/places.ts
// ---------------------------------------------------------------------------
// Location guides.
//
// These carry the heaviest SEO load: they capture people who know *where* they
// want to stay but not yet *who* to book with.
//
// FACT DISCIPLINE. Everything stated about a place is either general knowledge
// or verified from a public source — Aburi being roughly an hour and 30 km
// north of Accra, the Botanical Gardens being its principal attraction, and the
// seasonal pattern below, all checked against travel sources. Property facts
// (rates, capacity, amenities) come from app/lib/data.ts.
//
// Anything only the owner can know — exact drive time from a specific gate,
// which way a balcony faces — is deliberately NOT invented. Those are listed as
// enrichment targets rather than filled with plausible-sounding fiction.
// ---------------------------------------------------------------------------

import type { Guide } from "./types";

const HOME = "/";
const VILLAS = "/#villas";

export const PLACE_GUIDES: Guide[] = [
  {
    slug: "where-to-stay-in-accra",
    title: "Where to stay in Accra: a neighbourhood guide",
    metaTitle: "Where to Stay in Accra — Neighbourhood Guide",
    description:
      "East Legon, Airport Residential, Osu, Adenta or Lakeside Estate? An honest guide to Accra's main areas for short lets, and which suits which kind of trip.",
    summary:
      "Accra is not one place. The area you choose decides how long you sit in traffic, what you eat, and whether you sleep. Here is how the main neighbourhoods differ — written for someone booking a short let rather than a hotel.",
    category: "Where to stay",
    targetQuery: "where to stay in Accra",
    keywords: [
      "where to stay in Accra",
      "best area to stay in Accra",
      "Accra neighbourhoods",
      "short let Accra",
      "accommodation Accra Ghana",
    ],
    updated: "2026-09-22",
    readingMinutes: 6,
    sections: [
      {
        heading: "The short answer",
        paragraphs: [
          "If you want nightlife and restaurants within walking distance, stay central: Osu or Labone. If you want quiet, space and a pool, stay in the residential north-east — East Legon, Adenta or Lakeside Estate. If your trip is about the mountains rather than the city, base yourself in Aburi and drive in.",
          "Traffic is the single biggest factor in how a trip to Accra feels. Almost nothing is far in kilometres; plenty is far in minutes. Choose the area nearest the thing you will actually do most, not the one that sounds most prestigious.",
        ],
      },
      {
        heading: "Osu and Labone — central, walkable, lively",
        paragraphs: [
          "Osu is the commercial and nightlife heart. Oxford Street, restaurants, bars, live music — all on foot. Labone, immediately west, is the calmer residential sibling with the same convenience.",
          "Suits: short city breaks, business travellers who want to walk to dinner, anyone without a car.",
          "Trade-off: it is the loudest option, parking is scarce, and you get less space for your money than anywhere else on this list.",
        ],
      },
      {
        heading: "East Legon and Airport Residential — polished and convenient",
        paragraphs: [
          "East Legon is where much of Accra's newer, higher-end housing sits: gated compounds, good roads, malls and international schools. Airport Residential sits closer to Kotoka International and the city centre, and is popular with consultants and airline crews.",
          "Suits: business travel, families, anyone who wants dependable infrastructure and easy airport access.",
          "Trade-off: the most expensive areas for short lets, and still car-dependent — you will not be walking anywhere.",
        ],
      },
      {
        heading: "Adenta and Lakeside Estate — residential, quieter, better value",
        paragraphs: [
          "North-east of the centre, Adenta is a settled residential suburb: markets, everyday shops, a genuine neighbourhood rather than a tourist district. Lakeside Estate sits within the same broad area, built around water and greenery.",
          "This is where a short let makes the most sense. You get room to spread out, a private pool, and rates that are a fraction of the central districts — with the trade-off that you will want a car or a ride-hailing app.",
          "We have two properties here: [Adenta Serenity](/villas/3), which sleeps four and includes a grand piano alongside the usual amenities, and [Lakeside Estate](/villas/1), a larger three-bedroom apartment with a pool.",
        ],
      },
      {
        heading: "Aburi — the hills, an hour out",
        paragraphs: [
          "Technically the Eastern Region rather than Accra, but close enough to be a genuine alternative base. Aburi sits in the hills about an hour's drive north of the city, roughly 30 km, and the temperature drops noticeably once you climb.",
          "Suits: anyone whose trip is about rest rather than the city, and travellers combining Accra with the Eastern Region.",
          "Trade-off: you are committing to the drive. Great for a few days, less convenient as a base for daily city meetings.",
          "See our full [guide to staying in Aburi](/guides/staying-in-aburi), or the [Aburi Mountain Retreat](/villas/2) itself.",
        ],
      },
      {
        heading: "How to choose",
        list: [
          "Here for nightlife and food, no car — Osu or Labone.",
          "Here for work, airport access — East Legon or Airport Residential.",
          "Here with family, want a pool and space — Adenta or Lakeside Estate.",
          "Here to rest, happy to drive — Aburi.",
        ],
      },
    ],
    related: [
      { label: "Short let apartments in Adenta", href: "/guides/short-let-adenta" },
      { label: "Staying in Aburi: the complete guide", href: "/guides/staying-in-aburi" },
      { label: "Apartment or hotel in Accra?", href: "/guides/apartment-or-hotel-accra" },
    ],
    cta: {
      label: "See all our apartments",
      href: VILLAS,
      note: "Three furnished properties in Greater Accra and the Eastern Region.",
    },
  },

  {
    slug: "short-let-adenta",
    title: "Short let apartments in Adenta: what to expect",
    metaTitle: "Short Let Apartments in Adenta, Accra",
    description:
      "What a short let in Adenta actually includes, what it costs, and what is nearby — plus a four-guest apartment with a private pool from GH₵1,500 a night.",
    summary:
      "Adenta is one of Accra's most practical places to stay: genuinely residential, well connected, and considerably better value than the central districts. Here is what booking a short let here actually gets you.",
    category: "Where to stay",
    targetQuery: "short let Adenta",
    keywords: [
      "short let Adenta",
      "short stay Adenta",
      "furnished apartment Adenta",
      "apartment for rent Adenta Accra",
      "Airbnb Adenta",
    ],
    updated: "2026-09-22",
    readingMinutes: 5,
    sections: [
      {
        heading: "What a short let means in Ghana",
        paragraphs: [
          "In Ghana the trade says \"short let\" rather than \"holiday rental\". It means a fully furnished apartment rented by the night, with no long lease and no utility accounts in your name. You turn up with a suitcase; everything else is already there.",
          "That is different from a hotel in ways that matter over more than a night or two: a kitchen you can actually cook in, a living room that is yours, a washing machine, and no one knocking at 10am.",
        ],
      },
      {
        heading: "Why Adenta works",
        paragraphs: [
          "Adenta sits north-east of central Accra, well placed for both the city and the Eastern Region road. It is a settled residential suburb — markets, everyday shops, pharmacies, places to eat — rather than a tourist district, which is exactly why it is calmer and cheaper than East Legon or Airport Residential.",
          "If you are visiting family, working in the north-east of the city, or simply want space and quiet without a long commute, it is a sensible base. You will want a car or a ride-hailing app; this is not a walking neighbourhood.",
        ],
      },
      {
        heading: "What you get at Adenta Serenity",
        paragraphs: [
          "[Adenta Serenity](/villas/3) sleeps four across four bedrooms, with five bathrooms — genuinely comfortable for two couples or a family rather than a squeeze.",
          "Amenities include a private pool, fully equipped kitchen, free Wi-Fi, a well-furnished living hall, televisions in the rooms, a grand piano and a PS5. The piano is unusual and, in practice, the thing guests remember.",
        ],
        list: [
          "Four guests, 4 bedrooms, 5 bathrooms",
          "Private pool",
          "From GH₵1,500 per night — whole apartment GH₵3,500",
          "Monthly rate available for longer stays",
        ],
      },
      {
        heading: "Rates and how to book",
        paragraphs: [
          "Short lets here are priced per apartment, not per person. You can take a single bedroom, two bedrooms, or the whole apartment, which makes it workable whether you are one person on a work trip or a full family.",
          "Book through [our listing](/villas/3) — payment is taken securely by card or mobile money, and you get a receipt immediately. If you would rather ask something first, use the [contact form](/contact) and we will answer before you commit.",
        ],
      },
      {
        heading: "One honest caveat",
        paragraphs: [
          "Adenta is not a tourist area. If your idea of Accra is stepping out of your door into a bar, this is not that. It is a place to come back to — quiet, secure, with room to breathe — and the city is a short drive away when you want it.",
        ],
      },
    ],
    related: [
      { label: "Where to stay in Accra", href: "/guides/where-to-stay-in-accra" },
      { label: "What a short let includes", href: "/guides/what-a-short-let-includes" },
      { label: "Booking an apartment in Ghana", href: "/guides/booking-an-apartment-in-ghana" },
    ],
    cta: { label: "View Adenta Serenity", href: "/villas/3" },
  },

  {
    slug: "staying-in-aburi",
    title: "Staying in Aburi: the complete guide",
    metaTitle: "Staying in Aburi, Ghana — Accommodation & Things to Do",
    description:
      "Aburi sits an hour north of Accra in the Eastern Region hills. What to see, when to go, and how to choose accommodation — including a four-guest retreat with a pool.",
    summary:
      "Aburi is where Accra goes to cool down. An hour up into the Eastern Region hills, it is greener, quieter and several degrees cooler than the coast. This is what to expect from a stay.",
    category: "Where to stay",
    targetQuery: "Aburi accommodation",
    keywords: [
      "Aburi accommodation",
      "places to stay in Aburi",
      "Aburi Ghana",
      "Aburi Botanical Gardens",
      "weekend getaway from Accra",
    ],
    updated: "2026-09-22",
    readingMinutes: 6,
    sections: [
      {
        heading: "Why Aburi",
        paragraphs: [
          "Aburi sits in the Akuapem hills in Ghana's Eastern Region, roughly an hour's drive and about 30 km north of Accra. The road climbs, the air changes, and by the time you arrive it is measurably cooler than the city you left.",
          "That contrast is the whole appeal. Ghanaians have treated Aburi as a weekend escape for generations, and it works just as well for a visitor who wants to see something other than the capital.",
        ],
      },
      {
        heading: "Getting there",
        paragraphs: [
          "The drive from Accra takes about an hour in normal conditions, longer if you leave at the wrong time. There is a well-known turn-off on the Accra–Koforidua road, after which the ascent begins and the views open up.",
          "Most visitors come by car, taxi or a ride-hailing app. If you are staying with us, ask before you book and we will tell you the current route and how long it is actually taking — road conditions change, and we would rather give you today's answer than a generic one.",
        ],
      },
      {
        heading: "What to do",
        paragraphs: [
          "The **Aburi Botanical Gardens** is the main attraction and the reason most people make the trip: broad lawns, mature trees, walking paths and a remarkably calm atmosphere. It is a garden to wander rather than a tick-box attraction, so give it a couple of hours.",
          "The **craft market** nearby is well known for wood carvings and drums — good for gifts, and worth an hour. Beyond that, the hills themselves are the draw: viewpoints, quiet roads, and cooler air in the evenings.",
        ],
        list: [
          "Aburi Botanical Gardens — the headline attraction",
          "Aburi craft market — carvings, drums, souvenirs",
          "Hilltop viewpoints over the Accra plain",
          "Walks and cooler evenings back at your accommodation",
        ],
      },
      {
        heading: "When to go",
        paragraphs: [
          "Aburi is a good choice in the hot months precisely because it is elevated. Ghana's dry season runs roughly October to March — with the harmattan, a dry dusty wind from the Sahara, from around December to February. The heaviest rain falls between April and June, with a lighter wet spell around September and October.",
          "If you are planning around weather, see our [guide to the best time to visit Ghana](/guides/best-time-to-visit-ghana).",
        ],
      },
      {
        heading: "Where to stay: the Aburi Mountain Retreat",
        paragraphs: [
          "[Aburi Mountain Retreat](/villas/2) sleeps four across four bedrooms with five bathrooms, and includes a private pool, fully equipped kitchen and free Wi-Fi. It is the quiet option — the kind of place you take a book to.",
          "Rates start at GH₵600 per night for a single bedroom, rising through a studio and larger configurations to GH₵3,500 for the whole apartment. A monthly rate is available for longer stays, which makes it a realistic base for a few weeks rather than just a weekend.",
        ],
      },
      {
        heading: "Who Aburi suits",
        paragraphs: [
          "It suits anyone whose trip is about rest, and anyone combining Accra with the Eastern Region. It suits couples, small families and remote workers who want quiet and a reliable connection.",
          "It does not suit someone who needs to be in central Accra every morning. Choose the city for that and come up for a night or two instead — the drive is easy enough to make it a proper break rather than an expedition.",
        ],
      },
    ],
    related: [
      { label: "Where to stay in Accra", href: "/guides/where-to-stay-in-accra" },
      { label: "The best time to visit Ghana", href: "/guides/best-time-to-visit-ghana" },
      { label: "Pet-friendly accommodation in Ghana", href: "/guides/pet-friendly-accommodation-ghana" },
    ],
    cta: { label: "View Aburi Mountain Retreat", href: "/villas/2" },
  },

  {
    slug: "lakeside-estate-accra",
    title: "Lakeside Estate, Accra: a local's guide",
    metaTitle: "Lakeside Estate Accra — A Guide for Short Stays",
    description:
      "What Lakeside Estate is like for a short stay in Accra: the setting, the security, who it suits, and a three-bedroom apartment with a pool from GH₵2,000 a night.",
    summary:
      "Lakeside Estate is a residential area in Greater Accra built around water and greenery — calmer than the city districts, greener than most of the coast, and a short drive from both central Accra and the Eastern Region road.",
    category: "Where to stay",
    targetQuery: "Lakeside Estate Accra accommodation",
    keywords: [
      "Lakeside Estate Accra",
      "Lakeside Estate apartment",
      "short let Lakeside Estate",
      "apartment with pool Accra",
    ],
    updated: "2026-09-22",
    readingMinutes: 4,
    sections: [
      {
        heading: "The setting",
        paragraphs: [
          "Lakeside Estate sits in the Greater Accra area, built around water and landscaped greenery. That combination is rarer than it sounds in Accra — most of the city is dense and paved, so an address with a view over water and space between buildings genuinely changes what a stay feels like.",
          "It is a residential area rather than a tourist one. Expect quiet evenings, neighbours rather than nightlife, and the sense of staying somewhere people actually live.",
        ],
      },
      {
        heading: "Security and getting around",
        paragraphs: [
          "Properties here are privately managed with 24/7 security, and our own listing adds secure parking on site. For a family or a group travelling with luggage and equipment, that matters more than a longer list of amenities.",
          "As with most of Accra's residential north-east, you will want a car or a ride-hailing app. The area is well connected by road to both central Accra and the route out towards the Eastern Region.",
        ],
      },
      {
        heading: "The apartment",
        paragraphs: [
          "[Lakeside Estate](/villas/1) sleeps four across three bedrooms with five bathrooms. It has a private pool, a fully equipped kitchen, free Wi-Fi, a well-furnished living hall, televisions in the rooms and a PS5.",
          "Rates start at GH₵1,500 per night for a single bedroom and GH₵3,500 for the whole apartment, with a monthly rate for longer stays. If you are weighing it against a hotel, our [comparison guide](/guides/apartment-or-hotel-accra) works through the real costs.",
        ],
      },
      {
        heading: "Who it suits",
        list: [
          "Families who want space, a pool and a kitchen rather than two hotel rooms",
          "Groups of up to four travelling together",
          "Anyone staying a week or more who would rather settle than check in",
          "Travellers combining Accra with a few days in the Eastern Region",
        ],
      },
    ],
    related: [
      { label: "Where to stay in Accra", href: "/guides/where-to-stay-in-accra" },
      { label: "Apartment or hotel in Accra?", href: "/guides/apartment-or-hotel-accra" },
      { label: "Long stays in Accra", href: "/guides/long-stays-in-accra" },
    ],
    cta: { label: "View Lakeside Estate", href: "/villas/1" },
  },
];

export const PLACE_SLUGS = PLACE_GUIDES.map((g) => g.slug);
export const GUIDE_HOME = HOME;
