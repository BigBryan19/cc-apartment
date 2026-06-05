"use client";

import React, { useState } from "react";
import { Search } from "lucide-react";
import Navbar from "./Navbar";
// Import the filter type from your main page file
import { SearchFilters } from "./villas/types";

interface HeroProps {
  currency: "GHS" | "USD";
  toggleCurrency: () => void;
  setSearchFilters: React.Dispatch<React.SetStateAction<SearchFilters>>;
}

const Hero: React.FC<HeroProps> = ({
  currency,
  toggleCurrency,
  setSearchFilters,
}) => {
  // Local state for inputs before pressing search
  const [localLocation, setLocalLocation] = useState("");
  const [localGuests, setLocalGuests] = useState(2);
  const [maxPrice, setMaxPrice] = useState(3000);

  const handlePriceChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setMaxPrice(Number(e.target.value));
  };

  const currencySymbol = currency === "GHS" ? "₵" : "$";

  // --- Handle Search Click ---
  const handleSearchClick = () => {
    // 1. Update global state
    setSearchFilters({
      location: localLocation,
      guests: localGuests,
      maxPrice: maxPrice,
    });

    // 2. Smooth scroll to villas section
    const villasSection = document.getElementById("villas");
    if (villasSection) {
      villasSection.scrollIntoView({ behavior: "smooth" });
    }
  };

  return (
    <div className="relative h-[90vh] w-full overflow-hidden">
      {/* --- RESTORED: Static Background Image --- */}
      <img
        src="/hero.png"
        alt="Hero Luxury Villa"
        className="absolute inset-0 w-full h-full object-cover opacity-100"
      />

      {/* Navbar with props passed down */}
      <Navbar currency={currency} toggleCurrency={toggleCurrency} />

      <div className="relative z-10 flex flex-col items-center justify-center h-full text-white px-4">
        <h1 className="text-5xl md:text-8xl font-serif mb-6 text-center shadow-sm drop-shadow-lg">
          BE OUR GUEST
        </h1>
        <p className="text-xs md:text-sm uppercase tracking-[0.2em] mb-12 bg-gray-900/30 px-6 py-3 backdrop-blur-md rounded-full border border-white/10">
          Live like a king in our best houses
        </p>

        {/* Search Bar Component */}
        <div className="bg-white rounded-lg p-2 flex flex-col md:flex-row gap-0 md:gap-4 items-center text-gray-700 shadow-2xl max-w-5xl w-full mx-4">
          {/* Input Group: Location */}
          <div className="flex-1 px-6 py-3 border-b md:border-b-0 md:border-r border-gray-100 w-full">
            <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">
              Location
            </label>
            <select
              className="w-full bg-transparent outline-none font-serif text-lg text-slate-800 cursor-pointer"
              value={localLocation}
              onChange={(e) => setLocalLocation(e.target.value)}
            >
              <option value="">All Locations</option>
              <option value="Aburi">Aburi (Eastern Region)</option>
              <option value="Lakeside">Lakeside (Greater Accra)</option>
            </select>
          </div>

          {/* Input Group: Dates */}
          <div className="flex-1 px-6 py-3 border-b md:border-b-0 md:border-r border-gray-100 w-full">
            <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">
              Dates
            </label>
            <input
              type="date"
              className="w-full bg-transparent outline-none font-serif text-sm text-slate-800"
            />
          </div>

          {/* Input Group: Guests */}
          <div className="flex-1 px-6 py-3 border-b md:border-b-0 md:border-r border-gray-100 w-full">
            <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">
              Guests
            </label>
            <select
              className="w-full bg-transparent outline-none font-serif text-lg text-slate-800 cursor-pointer"
              value={localGuests}
              onChange={(e) => setLocalGuests(Number(e.target.value))}
            >
              <option value="2">2 Guests</option>
              <option value="4">4 Guests</option>
              <option value="6">6+ Guests</option>
            </select>
          </div>

          {/* Input Group: Price Slider */}
          <div className="flex-1 px-6 py-3 w-full min-w-[200px]">
            <div className="flex justify-between items-center mb-2">
              <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider">
                Max Price
              </label>
              <span className="font-serif text-sm font-bold text-slate-900">
                Up to {currencySymbol}
                {maxPrice}
              </span>
            </div>

            <input
              type="range"
              min="100"
              max="5000"
              step="100"
              value={maxPrice}
              onChange={handlePriceChange}
              className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-slate-800"
            />
            <div className="flex justify-between text-[10px] text-gray-400 mt-1">
              <span>{currencySymbol}100</span>
              <span>{currencySymbol}5k+</span>
            </div>
          </div>

          {/* Functional Search Button */}
          <button
            onClick={handleSearchClick}
            className="bg-slate-700 hover:bg-slate-800 text-white px-8 py-4 rounded-md md:ml-2 flex items-center gap-2 w-full md:w-auto justify-center transition duration-300 shadow-lg active:scale-95"
          >
            Search <Search size={18} />
          </button>
        </div>
      </div>
    </div>
  );
};

export default Hero;
