// app/lib/guides/practical.ts
// ---------------------------------------------------------------------------
// Practical guides.
//
// These answer the questions that decide a booking. They are the least
// glamorous pages on the site and, per unit of effort, often the ones that
// convert best — someone reading "what does a short let include" is close to
// booking and simply wants the doubt removed.
//
// Facts about utilities, payments and seasons are kept general and true. Where
// something varies by property, it says so rather than guessing.
// ---------------------------------------------------------------------------

import type { Guide } from "./types";

export const PRACTICAL_GUIDES: Guide[] = [
  {
    slug: "what-a-short-let-includes",
    title: "What a short let actually includes in Ghana",
    metaTitle: "What's Included in a Short Let in Ghana?",
    description:
      "Power, water, internet, cleaning, house rules — a plain breakdown of what a furnished short let in Ghana includes, and what you should still bring.",
    summary:
      "The question guests ask most before booking, and the one most listings answer vaguely. Here is a straight breakdown of what is normally included in a Ghanaian short let, and what you are expected to sort out yourself.",
    category: "Practical",
    targetQuery: "what is included in a short let Ghana",
    keywords: [
      "what is included in a short let",
      "furnished apartment Ghana",
      "short let Ghana",
      "serviced apartment Accra",
      "Airbnb Ghana what to expect",
    ],
    updated: "2026-09-22",
    readingMinutes: 5,
    sections: [
      {
        heading: "The short answer",
        paragraphs: [
          "A short let in Ghana is normally a fully furnished, self-contained apartment with utilities already connected and paid, housekeeping included, and a kitchen you can cook in. You bring your clothes and your food. Everything else is there.",
          "Where listings differ is in the details — how often cleaning happens, whether electricity is capped, what happens if something breaks. Those are the things worth asking about directly.",
        ],
      },
      {
        heading: "Usually included",
        list: [
          "Furniture, bedding, towels and a fully equipped kitchen",
          "Electricity and water, already connected and paid by the host",
          "Internet — normally Wi-Fi, though speed varies by area",
          "Regular housekeeping, commonly weekly for longer stays",
          "Security, either a guard, a gated compound or both",
          "Parking, at most properties",
          "Air conditioning in the bedrooms",
        ],
      },
      {
        heading: "Usually not included",
        list: [
          "Food and groceries — you cook, or you order in",
          "Airport transfers, unless arranged separately",
          "Laundry beyond what a machine in the apartment handles",
          "Personal items: toiletries, adapters, medication",
          "A car — though we can help arrange one",
        ],
      },
      {
        heading: "Please bring a UK-style adapter",
        paragraphs: [
          "Ghana uses British-style three-pin plugs at 230V. If your devices are on US or European plugs, bring an adapter. This is the single most common thing guests forget, and the one thing that is genuinely hard to solve at 11pm.",
        ],
      },
      {
        heading: "Power and water are worth asking about",
        paragraphs: [
          "Ghana's grid has improved considerably, but outages still happen. Most quality short lets run a backup supply that keeps lights, fans, internet and the fridge going, even if heavy appliances pause. Ask specifically what is backed up rather than assuming, because the answer is what separates a comfortable stay from a frustrating one.",
          "Water is similarly worth one question if you are staying somewhere remote. In the city it is rarely an issue.",
        ],
      },
      {
        heading: "House rules",
        paragraphs: [
          "Expect the usual: no smoking indoors, no parties beyond the number of guests booked, quiet hours at night. Some properties accept pets and some do not — ours at [Aburi](/villas/2) do, and pets are the reason we wrote a [separate guide](/guides/pet-friendly-accommodation-ghana) about it.",
          "Ask before you book rather than after. It is much easier to arrange something in advance than to negotiate it at the door.",
        ],
      },
      {
        heading: "Why this matters for what you pay",
        paragraphs: [
          "A nightly short-let rate looks higher than a hotel room until you count what it replaces: breakfast, laundry, bottled water, and the second room you would have needed for the children. Our [apartment or hotel comparison](/guides/apartment-or-hotel-accra) works through that arithmetic honestly, including the cases where a hotel wins.",
        ],
      },
    ],
    related: [
      { label: "Booking an apartment in Ghana", href: "/guides/booking-an-apartment-in-ghana" },
      { label: "Apartment or hotel in Accra?", href: "/guides/apartment-or-hotel-accra" },
      { label: "Long stays in Accra", href: "/guides/long-stays-in-accra" },
    ],
    cta: {
      label: "See what our apartments include",
      href: "/#villas",
      note: "Private pools, full kitchens and Wi-Fi at every property.",
    },
  },

  {
    slug: "best-time-to-visit-ghana",
    title: "The best time to visit Ghana",
    metaTitle: "Best Time to Visit Ghana — Weather by Season",
    description:
      "Ghana's dry season runs roughly October to March, with the harmattan from December. A month-by-month look at weather, and when to choose the coast or the hills.",
    summary:
      "Ghana is warm all year, so the question is not whether it will be hot but whether it will be wet, dusty, or busy. Here is how the seasons actually fall, and which one suits the trip you are planning.",
    category: "Practical",
    targetQuery: "best time to visit Ghana",
    keywords: [
      "best time to visit Ghana",
      "Ghana weather by month",
      "Ghana rainy season",
      "harmattan Ghana",
      "Ghana travel seasons",
    ],
    updated: "2026-09-22",
    readingMinutes: 6,
    sections: [
      {
        heading: "The short answer",
        paragraphs: [
          "Visit between **November and March** for dry, clear weather. December to February brings the harmattan — a dry, dusty wind off the Sahara that hazes the sky and dries the air, which some people love and others find uncomfortable.",
          "Avoid April to June if rain would spoil your plans. September and October bring a lighter wet spell.",
        ],
      },
      {
        heading: "Dry season: roughly October to March",
        paragraphs: [
          "This is the peak window. Rain is rare, roads are at their best, and the coast is at its most inviting. It is also when everyone else wants to travel, so book early — especially around Christmas and New Year, when Accra fills up with visitors returning home.",
          "The **harmattan** arrives somewhere around December to February. It is a dry, dusty wind from the Sahara. It brings lower humidity and a hazy sky, and it can be hard on anyone with respiratory sensitivity. Many people find the cooler, drier air a relief; it also means dust settles on everything.",
        ],
      },
      {
        heading: "Rainy season: roughly April to June",
        paragraphs: [
          "The heaviest rain in southern Ghana falls between April and June. It rarely rains all day — more often a heavy burst then clearing — but it is unpredictable enough to reshape a trip built around outdoor plans.",
          "The upside is real: lower prices, fewer people, and the landscape at its greenest. If you are coming for the hills rather than the beach, rain here is not the obstacle it sounds like.",
        ],
      },
      {
        heading: "The lighter wet spell: September and October",
        paragraphs: [
          "A second, gentler rainy period falls around September and October. It is less intense than the spring rains and often the sweet spot for anyone wanting green scenery and quiet without committing to the wet season proper.",
        ],
      },
      {
        heading: "Why the hills change the answer",
        paragraphs: [
          "Aburi sits in the Akuapem hills about an hour north of Accra, and the elevation makes a genuine difference to how a hot day feels. In the hottest months, a stay in the hills is noticeably more comfortable than the coast — and cooler in the evenings year-round.",
          "So the honest answer to \"when should I visit\" depends on where. If you are set on the coast, aim for the dry season. If you are heading for the hills, you have far more flexibility — see our [guide to staying in Aburi](/guides/staying-in-aburi).",
        ],
      },
      {
        heading: "What this means for booking",
        paragraphs: [
          "December to February is when our apartments fill fastest, particularly the larger configurations. If your dates are fixed and they fall in that window, book further ahead than you would elsewhere.",
          "For anything longer than a couple of weeks, ask about the monthly rate — it is materially better value than the nightly one, and it applies year-round.",
        ],
      },
    ],
    related: [
      { label: "Staying in Aburi", href: "/guides/staying-in-aburi" },
      { label: "Where to stay in Accra", href: "/guides/where-to-stay-in-accra" },
      { label: "Long stays in Accra", href: "/guides/long-stays-in-accra" },
    ],
    cta: { label: "Check availability", href: "/#villas" },
  },

  {
    slug: "apartment-or-hotel-accra",
    title: "Apartment or hotel in Accra? An honest comparison",
    metaTitle: "Apartment or Hotel in Accra? An Honest Comparison",
    description:
      "Space, cost, kitchens, service and privacy — where a short let in Accra beats a hotel, and the trips where a hotel genuinely wins. No sales pitch.",
    summary:
      "We rent apartments, so you would expect us to say apartments. We will not — there are trips where a hotel is clearly the right call. Here is the comparison we would want if we were the ones booking.",
    category: "Practical",
    targetQuery: "apartment vs hotel Accra",
    keywords: [
      "apartment vs hotel Accra",
      "serviced apartment Accra",
      "short let vs hotel Ghana",
      "where to stay Accra with family",
    ],
    updated: "2026-09-22",
    readingMinutes: 5,
    sections: [
      {
        heading: "Where apartments clearly win",
        paragraphs: [
          "**Anything longer than three nights.** This is the real dividing line. A hotel is pleasant for two nights and grating by the fifth. An apartment gets better the longer you stay, because the things that matter — a kitchen, a washing machine, a living room, not eating every meal out — compound.",
          "**Families and groups.** Four people in a hotel is two rooms, two bathrooms' worth of arguments, and no shared space except the lobby. In one of our apartments the same four people get [four bedrooms and five bathrooms](/villas/3) for a single price.",
          "**Anyone who cooks.** Eating out for every meal in Accra adds up quickly. A full kitchen changes the daily arithmetic more than a lower room rate ever does.",
        ],
      },
      {
        heading: "Where hotels clearly win",
        paragraphs: [
          "**One night, or a long layover.** By the time you have found the apartment, met someone for keys and worked out the wifi, a hotel would have had you asleep an hour ago.",
          "**You want service, not independence.** Daily housekeeping, room service at midnight, a concierge who fixes things — a working hotel does this better than a private apartment, always.",
          "**Central location without a car.** If you want to walk out of the door into Osu's restaurants, take a hotel or a serviced apartment in Osu. Our properties are residential and you will need transport.",
          "**Corporate billing and loyalty points.** If your employer needs a single invoice from a recognised chain, that is a legitimate reason and an apartment will not solve it.",
        ],
      },
      {
        heading: "The costs people forget to compare",
        paragraphs: [
          "A room rate is not the price of a trip. When comparing, count:",
        ],
        list: [
          "Meals — how many would you cook rather than buy?",
          "Laundry — hotel pricing per item is steep over a week",
          "Water and drinks, which a kitchen replaces almost entirely",
          "A second room, if you are more than two",
        ],
      },
      {
        heading: "How ours are priced",
        paragraphs: [
          "We price per apartment, not per person, and you can take a smaller configuration if you do not need the whole place. [Lakeside Estate](/villas/1) starts at GH₵1,500 a night for a single bedroom and GH₵3,500 for the whole apartment. [Adenta Serenity](/villas/3) and the [Aburi Mountain Retreat](/villas/2) both start at GH₵600 for a single bedroom, with a monthly rate for longer stays.",
          "All three sleep four, have a private pool and a full kitchen.",
        ],
      },
      {
        heading: "The honest verdict",
        paragraphs: [
          "Two nights in the middle of the city, no car, want to be looked after? Book a hotel, genuinely.",
          "Three nights or more, travelling as a family or a group, or here to settle rather than tour? An apartment wins on cost, comfort and how the trip actually feels. And if you are unsure, [ask us](/contact) — we will tell you if a hotel suits your dates better.",
        ],
      },
    ],
    related: [
      { label: "What a short let includes", href: "/guides/what-a-short-let-includes" },
      { label: "Where to stay in Accra", href: "/guides/where-to-stay-in-accra" },
      { label: "Long stays in Accra", href: "/guides/long-stays-in-accra" },
    ],
    cta: { label: "See the apartments", href: "/#villas" },
  },

  {
    slug: "booking-an-apartment-in-ghana",
    title: "Booking an apartment in Ghana: deposits, ID and payment",
    metaTitle: "How to Book an Apartment in Ghana Safely",
    description:
      "Why operators ask for ID, how deposits work, and how to tell a legitimate short let from a scam — including paying by card or mobile money instead of transfer.",
    summary:
      "Renting accommodation in a country you do not know takes trust, and Ghana's rental market has earned some caution. Here is how legitimate booking works, and the warning signs worth walking away from.",
    category: "Practical",
    targetQuery: "how to book an apartment in Ghana",
    keywords: [
      "how to book an apartment in Ghana",
      "short let deposit Ghana",
      "short let scam Ghana",
      "pay for apartment Ghana mobile money",
    ],
    updated: "2026-09-22",
    readingMinutes: 5,
    sections: [
      {
        heading: "What a normal booking looks like",
        list: [
          "You confirm dates, the configuration and the total before paying anything",
          "You pay by card or mobile money through a recognised payment provider",
          "You receive a written confirmation and a receipt",
          "You are told exactly how you will get access on arrival, and who to call",
        ],
      },
      {
        heading: "Why we ask for ID",
        paragraphs: [
          "A legitimate operator will ask for identification, and you should be slightly suspicious of one that does not. Short lets involve handing over the keys to a private home, and the market has had genuine problems with people booking under false details.",
          "It is a security measure for the property and, frankly, for you — the same reason hotels check passports.",
        ],
      },
      {
        heading: "Paying: the part that matters most",
        paragraphs: [
          "Pay through a payment provider that gives you a record: a card payment, or mobile money through a gateway. You get a receipt, there is a transaction reference, and there is a paper trail if anything goes wrong.",
          "Be cautious about **transfer-only** arrangements — being asked to send money directly to a personal account with no receipt and no verifiable business behind it. That pattern is the single most common shape of rental fraud, in Ghana and everywhere else.",
          "When you book with us, payment is handled by Paystack, a licensed payment provider. You can pay by card or mobile money, you are redirected to Paystack's own secure page, and you receive a receipt by email immediately. Your card details are never handled by us.",
        ],
      },
      {
        heading: "Deposits and cancellation",
        paragraphs: [
          "Short lets commonly take either full payment up front or a deposit with the balance on arrival. Longer and monthly stays usually involve a refundable security deposit held against damage, returned after checkout.",
          "Cancellation terms vary. Ours allow changes or cancellation up to 48 hours before check-in — see the [FAQ](/#faq) for the current policy, and get anything unusual in writing before you pay.",
        ],
      },
      {
        heading: "Warning signs",
        list: [
          "Prices far below everything comparable — the oldest trick there is",
          "Pressure to pay immediately, before you have asked questions",
          "No verifiable address, no business name, no reviews anywhere",
          "Photos that appear elsewhere online — reverse image search them",
          "Reluctance to let you pay by any traceable method",
          "A request to move the conversation to a channel with no record",
        ],
      },
      {
        heading: "Questions worth asking before you pay",
        paragraphs: [
          "What exactly is included, and what is not? Who do I contact on arrival, and how? What is the cancellation policy if my flight changes? Is there a backup power supply?",
          "A legitimate host answers all of these without hesitation. We would rather answer twenty questions now than have a guest arrive uncertain — [ask us anything](/contact) before you book.",
        ],
      },
    ],
    related: [
      { label: "What a short let includes", href: "/guides/what-a-short-let-includes" },
      { label: "Where to stay in Accra", href: "/guides/where-to-stay-in-accra" },
      { label: "Apartment or hotel in Accra?", href: "/guides/apartment-or-hotel-accra" },
    ],
    cta: { label: "Book securely", href: "/#villas", note: "Payments handled by Paystack." },
  },
];
