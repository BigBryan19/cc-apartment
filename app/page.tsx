// app/page.tsx
"use client";

import React, { useState } from "react";
import Hero from "./components/Hero";
import Villas from "./components/villas/Villas";
import Regions from "./components/Regions";
import Specialties from "./components/Specialties";
import Packages from "./components/Packages";
import Testimonials from "./components/Testimonials";
import HostCTA from "./components/HostCTA";
import FAQ from "./components/FAQ";
import FloatingWhatsApp from "./components/FloatingWhatsApp";
import AboutUs from "./components/AboutUs";
import Footer from "./components/Footer";
import { SearchFilters } from "./components/villas/types";

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

        <FAQ />
      </main>

      <Footer />
      <FloatingWhatsApp />
    </div>
  );
};

export default App;
