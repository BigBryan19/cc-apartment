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
import { bundledVillas as villasData } from "./lib/catalog";
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

  /*
   * Experience and policy pages. These did not exist before, so they were absent
   * from the sitemap; /packages and /contact were also linked from the honeymoon
   * guide and 404'd. They are listed now that they resolve.
   *
   * Search-value pages carry a real priority; the legal pages are listed so they
   * are discoverable but not promoted, since they are not pages anyone searches
   * for.
   */
  const packagePages: MetadataRoute.Sitemap = [
    { path: "/packages", priority: 0.8 },
    { path: "/packages/honeymoon", priority: 0.7 },
    { path: "/packages/birthday", priority: 0.7 },
    { path: "/packages/birthday-room-setup", priority: 0.6 },
    { path: "/packages/birthday-celebration", priority: 0.6 },
    { path: "/packages/private-gathering", priority: 0.7 },
  ].map(({ path, priority }) => ({
    url: absoluteUrl(path),
    lastModified: new Date(),
    changeFrequency: "weekly" as const,
    priority,
  }));

  const supporterPages: MetadataRoute.Sitemap = [
    { path: "/contact", priority: 0.7 },
    { path: "/terms", priority: 0.2 },
    { path: "/privacy", priority: 0.2 },
    { path: "/imprint", priority: 0.1 },
  ].map(({ path, priority }) => ({
    url: absoluteUrl(path),
    lastModified: new Date(),
    changeFrequency: "monthly" as const,
    priority,
  }));

  return [
    {
      url: SITE_URL,
      lastModified,
      changeFrequency: "daily",
      priority: 1,
      images: [absoluteUrl("/og-cover.jpg")],
    },
    ...packagePages,
    ...supporterPages,
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
