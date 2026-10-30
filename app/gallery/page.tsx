// app/gallery/page.tsx
// ---------------------------------------------------------------------------
// The full Media & Gallery.
//
// Reads the owner-managed `gallery_media` table when Supabase is configured and
// falls back to the bundled, real-media catalogue otherwise. Only photographs
// and videos that actually exist for these properties are shown.
// ---------------------------------------------------------------------------

import type { Metadata } from "next";
import Link from "next/link";
import GuideShell from "../components/guides/GuideShell";
import JsonLd from "../components/JsonLd";
import GallerySection from "../components/gallery/GallerySection";
import { SITE, SITE_URL, breadcrumbJsonLd } from "../lib/seo";
import {
  DEFAULT_GALLERY,
  sortGallery,
  toGalleryItem,
  type GalleryItem,
} from "../lib/gallery";
import { createClient, isSupabaseConfigured } from "../utils/supabase";
import { GALLERY_TABLE } from "../lib/tables";

export const metadata: Metadata = {
  title: "Media & Gallery",
  description:
    "Photographs and walkthrough videos of Cosy Crest apartments in Aburi, Adenta and Lakeside Estate, Ghana.",
  alternates: { canonical: "/gallery" },
  openGraph: {
    type: "website",
    title: `Media & Gallery — ${SITE.shortName}`,
    description:
      "Photographs and walkthrough videos of Cosy Crest apartments in Aburi, Adenta and Lakeside Estate.",
    url: "/gallery",
    locale: "en_GH",
    images: [{ url: "/og-cover.jpg", alt: SITE.name }],
  },
};

/**
 * Server-side read of the owner's media.
 *
 * Any failure falls back to the bundled list rather than rendering an empty
 * page — a gallery that 500s because a table is missing is worse than one
 * showing the photographs that ship with the site.
 */
async function loadGallery(): Promise<GalleryItem[]> {
  if (!isSupabaseConfigured()) return DEFAULT_GALLERY;
  try {
    const { data, error } = await createClient()
      .from(GALLERY_TABLE)
      .select("id, type, src, poster, category, title, caption, villa_id, sort_order")
      .order("sort_order", { ascending: true });

    if (error || !data?.length) return DEFAULT_GALLERY;

    const mapped = (data as Record<string, unknown>[])
      .map((row, index) => toGalleryItem(row, index))
      .filter((item): item is GalleryItem => item !== null);

    return mapped.length ? sortGallery(mapped) : DEFAULT_GALLERY;
  } catch {
    return DEFAULT_GALLERY;
  }
}

export default async function GalleryPage() {
  const items = await loadGallery();

  return (
    <GuideShell>
      <JsonLd
        data={breadcrumbJsonLd([
          { name: "Home", path: "/" },
          { name: "Media & Gallery", path: "/gallery" },
        ])}
      />
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "ImageGallery",
          name: "Cosy Crest Media & Gallery",
          url: `${SITE_URL}/gallery`,
        }}
      />

      <main className="pt-28 md:pt-32">
        <div className="shell pb-8">
          <nav aria-label="Breadcrumb" className="mb-6 text-sm">
            <Link
              href="/"
              className="text-[var(--color-muted)] transition-colors hover:text-[var(--color-ink)]"
            >
              Home
            </Link>
            <span className="mx-2 text-[var(--color-faint)]">/</span>
            <span className="text-[var(--color-ink)]">Media &amp; Gallery</span>
          </nav>
        </div>

        <div className="shell pb-24">
          <GallerySection items={items} variant="page" heading="Every angle, before you book" />
        </div>
      </main>
    </GuideShell>
  );
}
