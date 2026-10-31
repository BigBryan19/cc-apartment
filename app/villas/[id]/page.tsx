// app/villas/[id]/page.tsx
import type { Metadata } from "next";
import { createClient } from "@supabase/supabase-js";
import { bundledVillas as villasData, toVillaProps } from "../../lib/catalog";
import type { VillaProps } from "../../components/villas/types";
import VillaClient from "./VillaClient";
import JsonLd from "../../components/JsonLd";
import { SITE, breadcrumbJsonLd, villaJsonLd } from "../../lib/seo";

/**
 * Rebuild each property page at most once a minute.
 *
 * The page now reads the property from the database rather than only from the
 * bundled catalogue, so an owner who changes a rate in admin sees it on the
 * public page shortly afterwards instead of waiting for a deploy.
 */
export const revalidate = 60;

export function generateStaticParams() {
  return villasData.map((villa) => ({
    id: villa.id.toString(),
  }));
}

/**
 * Resolve a property from the database, falling back to the bundled catalogue.
 *
 * WHY THIS EXISTS
 *
 *   The detail page used to read ONLY the bundled `villasData`, while the
 *   checkout read the database. Whenever the two disagreed, the guest saw one
 *   price on the property page and was charged another at payment — which is
 *   exactly the "everything becomes 600" report: the checkout could not match
 *   the chosen rate against the database's own rate list and fell back to the
 *   first (cheapest) row.
 *
 *   Both screens now resolve through `toVillaProps` on the same row.
 *
 * Uses the anon key: `villas` is public-read, and the service-role key must never
 * be pulled into a page render.
 */
async function loadVilla(id: number): Promise<VillaProps | null> {
  const bundled = villasData.find((villa) => villa.id === id) ?? null;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !anonKey) return bundled;

  try {
    const supabase = createClient(url, anonKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const { data, error } = await supabase
      .from("villas")
      .select("*")
      .eq("id", id)
      .maybeSingle();

    if (error || !data) return bundled;
    return toVillaProps(data as never);
  } catch {
    // A database hiccup must not take the property page down; the bundled copy
    // is the same property, just possibly older rates.
    return bundled;
  }
}

/**
 * Per-property metadata.
 *
 * Each apartment needs its own title, description, canonical and preview image.
 * Without this every property page would inherit the site-wide ones and
 * compete with itself in results.
 */
export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const villa = await loadVilla(Number(id));

  if (!villa) {
    return {
      title: "Property not found",
      robots: { index: false, follow: true },
    };
  }

  const path = `/villas/${villa.id}`;

  // Lead with the facts a searcher actually types: where, how many it sleeps,
  // and the entry price.
  const description =
    `${villa.title} in ${villa.location} — sleeps ${villa.guests}, ` +
    `${villa.bedrooms} bedrooms, ${villa.bathrooms} bathrooms. ` +
    `${villa.description}`.slice(0, 300);

  const images = (villa.images?.length ? villa.images : [villa.image]).map(
    (src) => ({ url: src, alt: villa.title }),
  );

  return {
    title: villa.title,
    description,
    alternates: { canonical: path },
    openGraph: {
      type: "website",
      title: `${villa.title} — ${SITE.shortName}`,
      description,
      url: path,
      siteName: SITE.name,
      locale: "en_GH",
      // No width/height: the source photos are not 1200x630, and declaring
      // dimensions that do not match makes some platforms letterbox or reject
      // the image outright.
      images,
    },
    twitter: {
      card: "summary_large_image",
      title: `${villa.title} — ${SITE.shortName}`,
      description,
      images: [villa.images?.[0] ?? villa.image],
    },
  };
}

export default async function VillaDetailsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const villa = await loadVilla(Number(id));

  return (
    <>
      {villa && (
        <JsonLd
          data={[
            villaJsonLd(villa),
            breadcrumbJsonLd([
              { name: "Home", path: "/" },
              { name: "Apartments", path: "/" },
              { name: villa.title, path: `/villas/${villa.id}` },
            ]),
          ]}
        />
      )}
      <VillaClient params={params} villa={villa} />
    </>
  );
}
