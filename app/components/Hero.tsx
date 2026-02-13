"use client";

import React, { useState } from "react";
import { Search } from "lucide-react";
import Navbar from "./Navbar";

const Hero: React.FC = () => {
  // State for the price slider (Defaulting to 3000)
  const [maxPrice, setMaxPrice] = useState(3000);

  const handlePriceChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setMaxPrice(Number(e.target.value));
  };

  return (
    <div className="relative h-[90vh] w-full">
      {/* Background Image */}
      <img
        src="/hero.png"
        alt="Hero Luxury Villa"
        className="absolute inset-0 w-full h-full object-cover opacity-100"
      />

      <Navbar />

      <div className="relative z-10 flex flex-col items-center justify-center h-full text-white px-4">
        <h1 className="text-5xl md:text-8xl font-serif mb-6 text-center shadow-sm">
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
            <select className="w-full bg-transparent outline-none font-serif text-lg text-slate-800 cursor-pointer">
              <option>--Select Location--</option>
              <option>Eastern Region</option>
              <option>Greater Accra Region</option>
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
            <select className="w-full bg-transparent outline-none font-serif text-lg text-slate-800 cursor-pointer">
              <option>2 Guests</option>
              <option>4 Guests</option>
              <option>6+ Guests</option>
            </select>
          </div>

          {/* Input Group: Price Slider */}
          <div className="flex-1 px-6 py-3 w-full min-w-[200px]">
            <div className="flex justify-between items-center mb-2">
              <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider">
                Max Price
              </label>
              <span className="font-serif text-sm font-bold text-slate-900">
                Up to ₵{maxPrice}
              </span>
            </div>

            {/* The Slider Input */}
            <input
              type="range"
              min="500"
              max="10000"
              step="100"
              value={maxPrice}
              onChange={handlePriceChange}
              className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-slate-800"
            />
            <div className="flex justify-between text-[10px] text-gray-400 mt-1">
              <span>₵500</span>
              <span>₵10k+</span>
            </div>
          </div>

          {/* Search Button */}
          <button className="bg-slate-700 hover:bg-slate-800 text-white px-8 py-4 rounded-md md:ml-2 flex items-center gap-2 w-full md:w-auto justify-center transition duration-300 shadow-lg">
            Search <Search size={18} />
          </button>
        </div>
      </div>
    </div>
  );
};

export default Hero;
