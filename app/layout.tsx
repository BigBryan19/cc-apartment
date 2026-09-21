// app/layout.tsx
import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono, Playfair_Display } from "next/font/google";
import "./globals.css";
import JsonLd from "./components/JsonLd";
import { SITE, SITE_URL, organizationJsonLd, websiteJsonLd } from "./lib/seo";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

// Display serif, applied deliberately via the `.font-display` utility on large
// headings only — UI text is sans throughout.
const playfair = Playfair_Display({
  variable: "--font-playfair",
  subsets: ["latin"],
  display: "swap",
  weight: ["400", "500", "600"],
});

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),

  // `default` is used by the homepage; `template` wraps every other page's own
  // title, so a property page reads "Lakeside Estate | Cosy Crest".
  title: {
    default: `${SITE.name} — ${SITE.tagline}`,
    template: `%s | ${SITE.shortName}`,
  },
  description: SITE.description,

  keywords: [
    "apartment for rent Accra",
    "short let Accra",
    "Airbnb Ghana",
    "furnished apartment Ghana",
    "Aburi accommodation",
    "Adenta short stay",
    "Lakeside Estate apartment",
    "holiday apartment Ghana",
    "honeymoon apartment Accra",
    "serviced apartment Greater Accra",
  ],

  applicationName: SITE.name,
  authors: [{ name: SITE.name, url: SITE_URL }],
  creator: SITE.name,
  publisher: SITE.name,
  category: "travel",

  // Overridden per page. Present so every page has exactly one canonical and
  // no page is left without one.
  alternates: { canonical: "/" },

  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      // Let Google use full-length snippets and large image previews; both are
      // free visibility that people often switch off by accident.
      "max-image-preview": "large",
      "max-snippet": -1,
      "max-video-preview": -1,
    },
  },

  openGraph: {
    type: "website",
    siteName: SITE.name,
    title: `${SITE.name} — ${SITE.tagline}`,
    description: SITE.description,
    url: SITE_URL,
    locale: "en_GH",
    images: [
      {
        url: "/hero-bg.png",
        width: 1200,
        height: 630,
        alt: "Cosy Crest furnished apartment in Ghana",
      },
    ],
  },

  twitter: {
    card: "summary_large_image",
    title: `${SITE.name} — ${SITE.tagline}`,
    description: SITE.description,
    images: ["/hero-bg.png"],
  },

  // Real values only once the codes exist — an invented verification token
  // achieves nothing and looks like configuration.
};

export const viewport: Viewport = {
  themeColor: "#455360",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} ${playfair.variable} antialiased`}
      >
        {/* Site-wide structured data. Tells search and answer engines who the
            business is, where it operates and how it can be contacted. */}
        <JsonLd data={[organizationJsonLd(), websiteJsonLd()]} />
        {children}
      </body>
    </html>
  );
}
