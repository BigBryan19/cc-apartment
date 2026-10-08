// app/privacy/page.tsx
// Replaces the footer's `href="#"`. Content is owner-supplied — see
// app/lib/policies.ts.
import type { Metadata } from "next";
import PolicyView from "../components/legal/PolicyView";
import { POLICIES } from "../lib/policies";
import { SITE } from "../lib/seo";

export const metadata: Metadata = {
  title: "Privacy Notice",
  description:
    "What Cosy Crest collects when you browse, enquire or book, why we hold it, and your rights over it.",
  alternates: { canonical: "/privacy" },
  openGraph: {
    type: "website",
    title: `Privacy Notice — ${SITE.shortName}`,
    url: "/privacy",
    locale: "en_GH",
    images: [{ url: "/og-cover.jpg", alt: SITE.name }],
  },
};

export default function PrivacyPage() {
  return <PolicyView policy={POLICIES.privacy} />;
}
