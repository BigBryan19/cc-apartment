// app/imprint/page.tsx
// Replaces the footer's `href="#"`. Content is owner-supplied — see
// app/lib/policies.ts.
import type { Metadata } from "next";
import PolicyView from "../components/legal/PolicyView";
import { POLICIES } from "../lib/policies";
import { SITE } from "../lib/seo";

export const metadata: Metadata = {
  title: "Imprint",
  description: "Who operates Cosy Crest, and how to reach us.",
  alternates: { canonical: "/imprint" },
  openGraph: {
    type: "website",
    title: `Imprint — ${SITE.shortName}`,
    url: "/imprint",
    locale: "en_GH",
    images: [{ url: "/og-cover.jpg", alt: SITE.name }],
  },
};

export default function ImprintPage() {
  return <PolicyView policy={POLICIES.imprint} />;
}
