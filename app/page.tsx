// app/page.tsx
"use client";

import React, { useState } from "react";
import dynamic from "next/dynamic"; 
import Hero from "./components/Hero";
import Villas from "./components/villas/Villas";
import Regions from "./components/Regions";
import Packages from "./components/Packages";
import Testimonials from "./components/Testimonials";
import FAQ from "./components/FAQ";
import FloatingWhatsApp from "./components/FloatingWhatsApp";
import AboutUs from "./components/AboutUs";
import Footer from "./components/Footer";
import { SearchFilters } from "./components/villas/types";

// 2. DYNAMICALLY IMPORT AnimateOnScroll AND DISABLE SSR
const AnimateOnScroll = dynamic(() => import("./components/AnimateOnScroll"), {
  ssr: false,
});

const App: React.FC = () => {
  const [currency, setCurrency] = useState<"GHS" | "USD">("GHS");
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
      <Hero
        currency={currency}
        toggleCurrency={toggleCurrency}
        setSearchFilters={setSearchFilters}
      />

      <AnimateOnScroll delay={0.2}>
        <AboutUs />
      </AnimateOnScroll>
      
      <AnimateOnScroll>
        <Villas currency={currency} searchFilters={searchFilters} />
      </AnimateOnScroll>

      <AnimateOnScroll delay={0.1}>
        <Regions />
      </AnimateOnScroll>

      <AnimateOnScroll delay={0.1}>
        <Packages />
      </AnimateOnScroll>

      <AnimateOnScroll delay={0.1}>
        <Testimonials />
      </AnimateOnScroll>

      <AnimateOnScroll delay={0.1}>
        <FAQ />
      </AnimateOnScroll>

      <Footer />
      <FloatingWhatsApp />
    </div>
  );
};

export default App;
