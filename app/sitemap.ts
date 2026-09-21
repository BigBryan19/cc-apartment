// app/sitemap.ts
// ---------------------------------------------------------------------------
// Served at /sitemap.xml
//
// Lists the homepage and one entry per property, with the property images
// attached so they are eligible for image search.
//
// NOTE: the property list comes from app/lib/data.ts, which is also what
// generates the static pages (generateStaticParams in app/villas/[id]). A villa
// added only to Supabase would not have a page to link to, so it is correctly
// absent here. Making admin-added properties crawlable means making the detail
// page read from the database first.
// ---------------------------------------------------------------------------

import type { MetadataRoute } from "next";
import { villasData } from "./lib/data";
import { GUIDES } from "./lib/guides";
import { SITE_URL, absoluteUrl } from "./lib/seo";

export default function sitemap(): MetadataRoute.Sitemap {
  const lastModified = new Date();

  const propertyPages: MetadataRoute.Sitemap = villasData.map((villa) => ({
    url: `${SITE_URL}/villas/${villa.id}`,
    lastModified,
    changeFrequency: "weekly",
    priority: 0.8,
    images: (villa.images?.length ? villa.images : [villa.image]).map(
      absoluteUrl,
    ),
  }));

  const guidePages: MetadataRoute.Sitemap = GUIDES.map((guide) => ({
    url: `${SITE_URL}/guides/${guide.slug}`,
    // Each guide carries its own revision date; using it is a truthful signal
    // about how fresh the page actually is.
    lastModified: new Date(guide.updated),
    changeFrequency: "monthly",
    priority: 0.7,
  }));

  return [
    {
      url: SITE_URL,
      lastModified,
      changeFrequency: "daily",
      priority: 1,
      images: [absoluteUrl("/hero-bg.png")],
    },
    ...propertyPages,
    {
      url: `${SITE_URL}/guides`,
      lastModified,
      changeFrequency: "weekly",
      priority: 0.8,
    },
    ...guidePages,
  ];
}
