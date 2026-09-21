// app/villas/[id]/page.tsx
import type { Metadata } from "next";
import { villasData } from "../../lib/data";
import VillaClient from "./VillaClient";
import JsonLd from "../../components/JsonLd";
import { SITE, breadcrumbJsonLd, villaJsonLd } from "../../lib/seo";

export function generateStaticParams() {
  return villasData.map((villa) => ({
    id: villa.id.toString(),
  }));
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
  const villa = villasData.find((v) => v.id === Number(id));

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
  const villa = villasData.find((v) => v.id === Number(id));

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
      <VillaClient params={params} />
    </>
  );
}
