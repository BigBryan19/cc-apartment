// app/page.tsx
"use client";

import React, { useState } from "react";
import Hero from "./components/Hero";
import Villas from "./components/villas/Villas";
import Regions from "./components/Regions";
import Specialties from "./components/Specialties";
import Packages from "./components/Packages";
import Testimonials from "./components/Testimonials";
import GuidesTeaser from "./components/GuidesTeaser";
import HostCTA from "./components/HostCTA";
import FAQ from "./components/FAQ";
import FloatingWhatsApp from "./components/FloatingWhatsApp";
import AboutUs from "./components/AboutUs";
import Footer from "./components/Footer";
import JsonLd from "./components/JsonLd";
import { SearchFilters } from "./components/villas/types";
import { FAQS } from "./lib/content";
import { faqJsonLd } from "./lib/seo";

const App: React.FC = () => {
  const [currency, setCurrency] = useState<"GHS" | "USD">("GHS");
  const [searchFilters, setSearchFilters] = useState<SearchFilters>({
    location: "",
    guests: 1,
    maxPrice: 10000,
  });

  const toggleCurrency = () =>
    setCurrency((prev) => (prev === "GHS" ? "USD" : "GHS"));

  return (
    <div className="bg-white font-sans text-[var(--color-ink)]">
      {/* FAQPage markup. The questions come from the same array the FAQ
          section renders, so the visible copy and the structured data always
          match — a mismatch is what gets FAQ rich results withdrawn. */}
      <JsonLd data={faqJsonLd(FAQS)} />

      <Hero
        currency={currency}
        toggleCurrency={toggleCurrency}
        setSearchFilters={setSearchFilters}
      />

      <main>
        <AboutUs />

        <Villas currency={currency} searchFilters={searchFilters} />

        <Regions />

        <Specialties />

        <Packages />

        <Testimonials />

        <HostCTA />

        {/* Internal links out to the guides. */}
        <GuidesTeaser />

        <FAQ />
      </main>

      <Footer />
      <FloatingWhatsApp />
    </div>
  );
};

export default App;
