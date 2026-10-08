// app/terms/page.tsx
// Replaces the footer's `href="#"`. Content is owner-supplied — see
// app/lib/policies.ts, which lists exactly what each section must cover and the
// decision the owner has to make.
import type { Metadata } from "next";
import PolicyView from "../components/legal/PolicyView";
import { POLICIES } from "../lib/policies";
import { SITE } from "../lib/seo";

export const metadata: Metadata = {
  title: "Terms & Conditions",
  description:
    "The terms that apply when you book accommodation, an experience or an event with Cosy Crest.",
  alternates: { canonical: "/terms" },
  openGraph: {
    type: "website",
    title: `Terms & Conditions — ${SITE.shortName}`,
    url: "/terms",
    locale: "en_GH",
    images: [{ url: "/og-cover.jpg", alt: SITE.name }],
  },
};

export default function TermsPage() {
  return <PolicyView policy={POLICIES.terms} />;
}
