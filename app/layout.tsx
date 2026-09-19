// app/layout.tsx
import type { Metadata } from "next";
import { Geist, Geist_Mono, Playfair_Display } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

// Display serif used by every `font-serif` heading (properties, prices, admin
// titles). Without a mapped serif these fell back to the browser default Times.
const displaySerif = Playfair_Display({
  variable: "--font-display-serif",
  subsets: ["latin"],
  display: "swap",
});

// Absolute base so Open Graph / Twitter image URLs resolve instead of
// falling back to localhost (which produced a build warning).
const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "") ||
  "https://www.cosycrest.com";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: "Cosy Crest - Luxury Villa & Apartment Rentals",
  description:
    "Experience comfort, privacy, and elegance in our premium furnished apartments in Accra and Aburi. Perfect for vacations, honeymoons, and getaways.",
  openGraph: {
    title: "Cosy Crest Luxury Apartments",
    description:
      "Book premium furnished apartments in Lakeside, Adenta, and Aburi. Exclusive packages for honeymoons and birthday celebrations.",
    url: SITE_URL, // Set NEXT_PUBLIC_SITE_URL to your live domain
    siteName: "Cosy Crest",
    images: [
      {
        url: "/hero.png", // This uses your existing hero image as the preview
        width: 1200,
        height: 630,
        alt: "Cosy Crest Luxury Apartment View",
      },
    ],
    locale: "en_GH",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Cosy Crest Luxury Apartments",
    description:
      "Experience comfort, privacy, and elegance in our serene environments.",
    images: ["/hero.png"],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} ${displaySerif.variable} antialiased`}
      >
        {children}
      </body>
    </html>
  );
}
