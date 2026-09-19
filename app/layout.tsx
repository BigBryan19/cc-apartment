// app/layout.tsx
import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Cosy Crest - Luxury Villa & Apartment Rentals",
  description:
    "Experience comfort, privacy, and elegance in our premium furnished apartments in Accra and Aburi. Perfect for vacations, honeymoons, and getaways.",
  openGraph: {
    title: "Cosy Crest Luxury Apartments",
    description:
      "Book premium furnished apartments in Lakeside, Adenta, and Aburi. Exclusive packages for honeymoons and birthday celebrations.",
    url: "https://www.cosycrest.com", // Replace with your actual domain when live
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
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        {children}
      </body>
    </html>
  );
}
