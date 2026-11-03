// app/page.tsx
"use client";

import React, { useState } from "react";
import Hero from "./components/Hero";
import Villas from "./components/villas/Villas";
import Regions from "./components/Regions";
import Specialties from "./components/Specialties";
import Services from "./components/Services";
import Testimonials from "./components/Testimonials";
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

        <Villas
          currency={currency}
          searchFilters={searchFilters}
          onClearRegion={() => setSearchFilters((prev) => ({ ...prev, region: undefined }))}
        />

        <Regions
          onSelectRegion={(region: string) => {
            // Clicking a destination narrows the apartments to that region and
            // clears any city filter that would contradict it. Clicking the
            // highlighted card again clears the filter.
            setSearchFilters((prev) => ({
              ...prev,
              region: prev.region === region ? undefined : region,
              location: "",
            }));
            document.getElementById("villas")?.scrollIntoView({ behavior: "smooth" });
          }}
          activeRegion={searchFilters.region}
        />

        <Specialties />

        <Services />

        <Testimonials />

        <HostCTA />

        <FAQ />
      </main>

      <Footer />
      <FloatingWhatsApp />
    </div>
  );
};

export default App;
