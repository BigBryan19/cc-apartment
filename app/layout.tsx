// app/layout.tsx
import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono, Playfair_Display } from "next/font/google";
import "./globals.css";
import JsonLd from "./components/JsonLd";
import { ThemeProvider } from "./components/ThemeProvider";
import { SITE, SITE_URL, organizationJsonLd, websiteJsonLd } from "./lib/seo";
import { DEFAULT_THEME, themeCss, toTheme } from "./lib/theme";
import { createServerClient } from "./utils/supabase-server";

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
        // A purpose-built 1200x630 card. The declared dimensions must match the
        // file — unfurlers crop to what is advertised, and the old
        // declaration (1200x630) did not match the asset (1920x924), so
        // previews cropped unpredictably. 0.1 MB, well inside the limits
        // LinkedIn, Slack and WhatsApp enforce.
        url: "/og-cover.jpg",
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
    images: ["/og-cover.jpg"],
  },

  // Real values only once the codes exist — an invented verification token
  // achieves nothing and looks like configuration.
};

export const viewport: Viewport = {
  themeColor: "#455360",
  width: "device-width",
  initialScale: 1,
};

/**
 * The owner's palette, read on the server.
 *
 * Rendered as a style tag in <head> so the first paint already uses the chosen
 * accent. A failed read falls back to the approved palette rather than leaving
 * the page unstyled.
 */
async function loadTheme() {
  try {
    const supabase = createServerClient();
    if (!supabase) return DEFAULT_THEME;
    const { data } = await supabase
      .from("site_settings")
      .select("value")
      .eq("key", "theme")
      .maybeSingle();
    return toTheme((data as { value?: unknown } | null)?.value);
  } catch {
    return DEFAULT_THEME;
  }
}

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const theme = await loadTheme();
  return (
    <html lang="en">
      <head>
        <style
          // Values are validated in app/lib/theme.ts: colours must be hex, text
          // is length-capped, the phone number is digits only.
          dangerouslySetInnerHTML={{ __html: themeCss(theme) }}
        />
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} ${playfair.variable} antialiased`}
      >
        {/* Site-wide structured data. Tells search and answer engines who the
            business is, where it operates and how it can be contacted. */}
        <JsonLd data={[organizationJsonLd(), websiteJsonLd()]} />
        <ThemeProvider theme={theme}>{children}</ThemeProvider>
      </body>
    </html>
  );
}
