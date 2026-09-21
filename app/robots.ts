// app/robots.ts
// ---------------------------------------------------------------------------
// Served at /robots.txt
// ---------------------------------------------------------------------------

import type { MetadataRoute } from "next";
import { SITE_URL } from "./lib/seo";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: [
          // Private or transactional surfaces. None of these should rank: an
          // indexed /receipt/<reference> would leak a guest's name, email and
          // phone number into search results.
          "/admin",
          "/admin/",
          "/api/",
          "/receipt/",
          // A checkout form with nothing in it is a poor landing page, and the
          // success page is meaningless without a transaction.
          "/checkout",
          "/checkout/",
        ],
      },
    ],
    sitemap: `${SITE_URL}/sitemap.xml`,
    host: SITE_URL,
  };
}
