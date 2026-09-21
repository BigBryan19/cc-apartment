// app/lib/guides/occasions.ts
// ---------------------------------------------------------------------------
// Occasion and interest guides.
//
// Nobody searches for "apartment". They search for the thing they are actually
// planning — a honeymoon, a trip with the dog, three days in Accra with the
// family. These pages meet that search, and they are also where the long-tail
// wins live, because the competition has not bothered.
//
// Package prices and inclusions come from app/components/Packages.tsx.
// ---------------------------------------------------------------------------

import type { Guide } from "./types";

export const OCCASION_GUIDES: Guide[] = [
  {
    slug: "honeymoon-in-ghana",
    title: "Honeymoon in Ghana: where to go and where to stay",
    metaTitle: "Honeymoon in Ghana — Where to Go & Where to Stay",
    description:
      "Planning a honeymoon or romantic getaway in Ghana: which regions suit which season, what a package usually includes, and how to get real privacy.",
    summary:
      "Ghana is an unusual honeymoon choice, which is a large part of its appeal — no crowds, no queue for the good table, and a country that treats guests seriously. Here is how to plan one properly.",
    category: "Occasions",
    targetQuery: "honeymoon in Ghana",
    keywords: [
      "honeymoon in Ghana",
      "romantic getaway Ghana",
      "honeymoon apartment Accra",
      "couples short let Ghana",
      "honeymoon packages Ghana",
    ],
    updated: "2026-09-22",
    readingMinutes: 5,
    sections: [
      {
        heading: "Why Ghana for a honeymoon",
        paragraphs: [
          "Most honeymoon destinations sell you a version of somewhere you have already seen. Ghana sells you something genuinely different: a warm, English-speaking West African country with beaches, rainforest, hill towns and one of the most welcoming cultures on the continent.",
          "The practical advantages matter too. Flights land at Kotoka International in Accra, English is an official language, and the currency and logistics are straightforward. For a couple who wants a real trip rather than a resort, it works exceptionally well.",
        ],
      },
      {
        heading: "Privacy is the thing to get right",
        paragraphs: [
          "The failure mode of a honeymoon is not bad weather — it is a room next to a family with small children, or a restaurant where you are seated at the busy table. Privacy is worth planning for deliberately.",
          "A private apartment solves most of this by default. Your own space, your own pool, no shared corridors, no fixed breakfast time, and the freedom to do nothing at all without anyone noticing. That is why couples tend to prefer them to hotels here.",
        ],
      },
      {
        heading: "Which region, and when",
        list: [
          "**Greater Accra** — the coast and the city. Best in the dry season, roughly November to March.",
          "**The Eastern Region hills** — Aburi and around. Cooler, greener, more private, and far more forgiving of the rainy months.",
          "**Both together** — the most common choice, and the one we would make: a few nights in the city, then up into the hills.",
        ],
      },
      {
        heading: "What we can arrange",
        paragraphs: [
          "Our [Honeymoon & Couples package](/packages) starts at GH₵500 and covers the part most couples do not want to organise themselves: the room set up properly before you arrive, with the details handled rather than improvised.",
          "It pairs with any of the three apartments. [Lakeside Estate](/villas/1) and [Adenta Serenity](/villas/3) are both in Greater Accra with private pools; the [Aburi Mountain Retreat](/villas/2) is the quieter, hillier option if you want to disappear for a few days.",
          "We can also arrange a car with a driver, which for a honeymoon is usually the difference between a relaxing trip and a logistical one.",
        ],
      },
      {
        heading: "A sensible shape for ten days",
        paragraphs: [
          "Three nights in Accra to land, eat well and see the city. Three or four in the hills to slow down. Then back to the coast to finish before your flight. It avoids the two mistakes couples make most: moving every two days, and spending the whole trip in a car.",
        ],
      },
    ],
    related: [
      { label: "Staying in Aburi", href: "/guides/staying-in-aburi" },
      { label: "The best time to visit Ghana", href: "/guides/best-time-to-visit-ghana" },
      { label: "Where to stay in Accra", href: "/guides/where-to-stay-in-accra" },
    ],
    cta: {
      label: "Ask about the honeymoon package",
      href: "/contact",
      note: "From GH₵500, arranged before you arrive.",
    },
  },

  {
    slug: "pet-friendly-accommodation-ghana",
    title: "Pet-friendly accommodation in Accra and Aburi",
    metaTitle: "Pet-Friendly Accommodation in Accra & Aburi, Ghana",
    description:
      "What to check before booking pet-friendly accommodation in Ghana, the fees and rules to expect, and an apartment in Aburi that welcomes small pets.",
    summary:
      "Finding somewhere in Ghana that genuinely accepts pets is harder than it should be. Here is what to check before you book, and what to expect once you find a place that says yes.",
    category: "Occasions",
    targetQuery: "pet friendly accommodation Ghana",
    keywords: [
      "pet friendly accommodation Ghana",
      "pet friendly short let Accra",
      "travel with pets Ghana",
      "dog friendly hotel Ghana",
    ],
    updated: "2026-09-22",
    readingMinutes: 4,
    sections: [
      {
        heading: "First, check that \"yes\" actually means yes",
        paragraphs: [
          "Many places say they are pet-friendly and mean they will tolerate a small dog in a carrier. Others mean a genuine welcome. Ask specifically: what size, how many, is there a fee, and is there anywhere secure for the animal to be outside.",
          "Ask before you pay, not after. It is a much easier conversation in advance.",
        ],
      },
      {
        heading: "What to expect",
        list: [
          "A cleaning fee, often per stay rather than per night",
          "Restrictions on the number and size of animals",
          "Pets kept out of bedrooms and off the furniture",
          "A requirement that you do not leave the animal alone in the apartment all day",
          "Garden or outdoor access, which varies enormously",
        ],
      },
      {
        heading: "Practicalities for Ghana specifically",
        paragraphs: [
          "If you are travelling with an animal from abroad, the paperwork is the hard part rather than the accommodation — check the current import requirements well in advance, and speak to your vet about timing.",
          "Within the country, a car makes everything simpler: animals are not generally welcome on public transport, and a private vehicle lets you stop when you need to.",
        ],
      },
      {
        heading: "Where we can help",
        paragraphs: [
          "Our [Aburi Mountain Retreat](/villas/2) accepts small pets. It sits in the hills with outdoor space, which is what most animals actually need after a journey, and it is quiet enough that a nervous animal settles quickly.",
          "It sleeps four across four bedrooms with a private pool and a full kitchen, from GH₵600 a night for a single bedroom. If you are travelling with a pet, [tell us when you enquire](/contact) and we will confirm what works for your dates before you book.",
        ],
      },
    ],
    related: [
      { label: "Staying in Aburi", href: "/guides/staying-in-aburi" },
      { label: "What a short let includes", href: "/guides/what-a-short-let-includes" },
      { label: "Booking an apartment in Ghana", href: "/guides/booking-an-apartment-in-ghana" },
    ],
    cta: { label: "Enquire about travelling with a pet", href: "/contact" },
  },

  {
    slug: "things-to-do-in-accra",
    title: "Things to do in Accra in three days",
    metaTitle: "Things to Do in Accra — A Three-Day Itinerary",
    description:
      "A realistic three-day Accra itinerary: history, markets, food and the coast, with the travel time actually accounted for — plus how to build in a day in the hills.",
    summary:
      "Accra rewards people who plan around traffic and punish those who do not. This is a three-day itinerary that assumes you are moving at the speed the city actually moves, rather than the speed a map suggests.",
    category: "Occasions",
    targetQuery: "things to do in Accra",
    keywords: [
      "things to do in Accra",
      "Accra itinerary",
      "Accra in 3 days",
      "what to see in Accra Ghana",
    ],
    updated: "2026-09-22",
    readingMinutes: 6,
    sections: [
      {
        heading: "Before you start",
        paragraphs: [
          "Two rules make the difference. First, group your day by area — crossing Accra twice in a day is how itineraries die. Second, start early. The city is dramatically easier before the morning peak and after the evening one.",
        ],
      },
      {
        heading: "Day one — the centre and the history",
        paragraphs: [
          "Begin at **Black Star Square** (Independence Square), the vast ceremonial ground with the Independence Arch — the symbolic heart of the country. Walk it before the heat builds.",
          "Then the **Kwame Nkrumah Memorial Park**, the mausoleum and museum dedicated to Ghana's first president, which gives the political history context that makes the rest of the city legible.",
          "Afternoon: **Jamestown**, the old colonial quarter, for the lighthouse, the fishing harbour and some of the most atmospheric streets in Accra. Go with a guide, not alone on foot at dusk.",
          "Finish in **Osu** — Oxford Street for dinner, and the busiest, most sociable part of the city.",
        ],
      },
      {
        heading: "Day two — markets, culture and the coast",
        paragraphs: [
          "**Makola Market** in the morning, when it is at its most alive. It is vast, loud and completely genuine — go early, keep your bag in front of you, and take a guide if you want to understand what you are looking at.",
          "Then the **National Museum of Ghana** for the country's material history, or the **W.E.B. Du Bois Memorial Centre** if you would rather spend the time on pan-African history — it is the former home of the man who died here in 1963.",
          "Afternoon at **Labadi Beach**, the most accessible of Accra's beaches, for a swim and something grilled. Weekends are lively; weekdays are calmer.",
        ],
      },
      {
        heading: "Day three — choose one",
        paragraphs: [
          "**Option A — the hills.** Drive up to [Aburi](/guides/staying-in-aburi), about an hour north, for the Botanical Gardens and the craft market. The temperature drops on the way up and it feels like a different country. This is the single best day trip from Accra.",
          "**Option B — stay in the city.** The **Legon Botanical Gardens** are a pleasant, green escape without leaving Accra, and the **Arts Centre** near Black Star Square is good for carvings, textiles and drums if you have gifts to buy.",
        ],
      },
      {
        heading: "Where to stay while you do all this",
        paragraphs: [
          "Our apartments are in the residential north-east and the Eastern Region — quieter, with private pools and kitchens, and cheaper than the central hotels for anything longer than a couple of nights. [Adenta Serenity](/villas/3) and [Lakeside Estate](/villas/1) are well placed for both the city and the Aburi road.",
          "You will want a car or a ride-hailing app. See [where to stay in Accra](/guides/where-to-stay-in-accra) for how the areas compare, and our [apartment or hotel comparison](/guides/apartment-or-hotel-accra) if you are still deciding.",
        ],
      },
    ],
    related: [
      { label: "Where to stay in Accra", href: "/guides/where-to-stay-in-accra" },
      { label: "Staying in Aburi", href: "/guides/staying-in-aburi" },
      { label: "The best time to visit Ghana", href: "/guides/best-time-to-visit-ghana" },
    ],
    cta: { label: "See the apartments", href: "/#villas" },
  },

  {
    slug: "long-stays-in-accra",
    title: "Long stays in Accra: what monthly rates include",
    metaTitle: "Long Stays in Accra — Monthly Apartment Rates",
    description:
      "What a monthly apartment rate in Accra covers, how it compares to a nightly booking, and what to check about utilities, housekeeping and internet before committing.",
    summary:
      "Staying a month or more in Accra is a different proposition from a week — better value, but with questions that only matter over time. Here is what to establish before you commit.",
    category: "Occasions",
    targetQuery: "monthly apartment Accra",
    keywords: [
      "monthly apartment Accra",
      "long stay Accra",
      "serviced apartment monthly Ghana",
      "extended stay Accra",
    ],
    updated: "2026-09-22",
    readingMinutes: 5,
    sections: [
      {
        heading: "Why monthly is better value",
        paragraphs: [
          "Nightly short-let rates include a premium for flexibility. Stay a month and that premium should largely disappear. Across our three apartments the monthly rate works out well below the nightly equivalent — often by more than a third.",
          "You also stop living out of a suitcase, which is the real benefit. A month in an apartment lets you cook, settle, have a routine and get to know a neighbourhood rather than a hotel corridor.",
        ],
      },
      {
        heading: "What to confirm before committing",
        list: [
          "**Utilities** — whether electricity and water are included in the monthly rate or billed on top, and how a capped supply works if there is one",
          "**Housekeeping** — how often it comes, and whether bedding and towels are changed",
          "**Internet** — the actual speed and reliability, plus whether a backup exists for outages",
          "**Backup power** — what stays on during an outage; this matters more over a month than a night",
          "**Deposit** — how much, and the conditions for getting it back in full",
          "**Notice period** — how much warning you need to give to extend or leave",
        ],
      },
      {
        heading: "Working from Accra",
        paragraphs: [
          "Reliable internet and backup power are the two things that decide whether a month of remote work goes well. Ask about both specifically, and be wary of \"yes, we have Wi-Fi\" without a speed or a fallback.",
          "Time zones suit Europe well and the Americas reasonably; the working day overlaps with London from morning and with New York from the afternoon. Many long-stay guests work Ghanaian mornings and take the afternoons for errands and the pool.",
        ],
      },
      {
        heading: "Our monthly rates",
        list: [
          "[Lakeside Estate](/villas/1) — GH₵36,000 per month, three bedrooms, private pool",
          "[Adenta Serenity](/villas/3) — GH₵36,000 per month, four bedrooms, private pool, grand piano",
          "[Aburi Mountain Retreat](/villas/2) — GH₵30,000 per month, four bedrooms, private pool, hillside setting",
        ],
      },
      {
        heading: "Which one for a long stay",
        paragraphs: [
          "If you need to be in Accra for work, Lakeside Estate or Adenta Serenity. If quiet matters more than the city, or you are writing, resting or working remotely, the Aburi Mountain Retreat is the better month — the temperature alone changes how you feel after three weeks.",
          "For anything over a month, [talk to us](/contact) before booking. It is easier to agree the details once than to renegotiate them halfway through.",
        ],
      },
    ],
    related: [
      { label: "Apartment or hotel in Accra?", href: "/guides/apartment-or-hotel-accra" },
      { label: "What a short let includes", href: "/guides/what-a-short-let-includes" },
      { label: "Where to stay in Accra", href: "/guides/where-to-stay-in-accra" },
    ],
    cta: { label: "Ask about monthly rates", href: "/contact" },
  },
];
