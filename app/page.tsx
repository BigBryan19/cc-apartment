"use client";

import React, { useState } from "react";
import Hero from "./components/Hero";
import Villas from "./components/Villas";
import Regions from "./components/Regions";
import Specialties from "./components/Specialties";
import AboutUs from "./components/AboutUs";
import Footer from "./components/Footer";

// --- Define Filter Interface globally ---
export interface SearchFilters {
  location: string;
  guests: number;
  maxPrice: number;
}

const App: React.FC = () => {
  const [currency, setCurrency] = useState<"GHS" | "USD">("GHS");

  // --- NEW: Search Filter State ---
  // Default: Empty location, 1 guest, high max price so everything shows initially
  const [searchFilters, setSearchFilters] = useState<SearchFilters>({
    location: "",
    guests: 1,
    maxPrice: 10000,
  });

  const toggleCurrency = () => {
    setCurrency((prev) => (prev === "GHS" ? "USD" : "GHS"));
  };

  return (
    <div className="font-sans text-slate-800 bg-stone-50 overflow-x-hidden">
      {/* Pass currency AND setter for filters to Hero */}
      <Hero
        currency={currency}
        toggleCurrency={toggleCurrency}
        setSearchFilters={setSearchFilters}
      />

      {/* Pass currency AND active filters to Villas */}
      <Villas currency={currency} searchFilters={searchFilters} />

      <Regions />
      <Specialties />
      <AboutUs />
      <Footer />
    </div>
  );
};

export default App;
