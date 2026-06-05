// components/navbar/Navbar.tsx
"use client";

import React, { useState, useEffect } from "react";
import { Menu, X, Globe, Check } from "lucide-react";

interface NavbarProps {
  currency: "GHS" | "USD";
  toggleCurrency: () => void;
}

const Navbar: React.FC<NavbarProps> = ({ currency, toggleCurrency }) => {
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  useEffect(() => {
    const handleScroll = () => setIsScrolled(window.scrollY > 50);
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  // --- NEW: Smooth Scroll Handler ---
  const handleBookNowClick = () => {
    setIsMobileMenuOpen(false); // Close mobile menu if open
    const villasSection = document.getElementById("villas");
    if (villasSection) {
      villasSection.scrollIntoView({ behavior: "smooth" });
    }
  };

  return (
    <nav
      className={`fixed top-0 left-0 w-full z-50 transition-all duration-300 ${
        isScrolled
          ? "bg-slate-900/90 backdrop-blur-md py-4 shadow-lg"
          : "bg-transparent py-6"
      }`}
    >
      <div className="max-w-7xl mx-auto px-6 md:px-12 flex justify-between items-center">
        <div className="flex items-center gap-2 cursor-pointer z-50">
          <img
            src="/cc-horinzontal.png"
            alt="COSY CREST"
            className="h-8 md:h-10"
          />
        </div>

        <div className="hidden md:flex items-center gap-8 text-xs tracking-[0.2em] font-medium uppercase text-white">
          {["Villas", "About Us", "Contact"].map((item) => (
            <a
              key={item}
              href={`#${item.toLowerCase().replace(" ", "")}`}
              className="relative group hover:text-gray-300 transition-colors py-2"
            >
              {item}
              <span className="absolute bottom-0 left-0 w-0 h-0.5 bg-white transition-all duration-300 group-hover:w-full"></span>
            </a>
          ))}
          <button
            onClick={toggleCurrency}
            className="flex items-center gap-2 hover:text-gray-300 transition border border-white/20 px-3 py-1 rounded-full"
          >
            <Globe size={14} /> <span>{currency}</span>
          </button>

          {/* Desktop Book Now Button */}
          <button
            onClick={handleBookNowClick}
            className="border border-white/30 px-5 py-2 hover:bg-white hover:text-slate-900 transition duration-300 rounded-sm"
          >
            Book Now
          </button>
        </div>

        <button
          className="md:hidden text-white z-50 p-2"
          onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
        >
          {isMobileMenuOpen ? <X size={28} /> : <Menu size={28} />}
        </button>

        <div
          className={`fixed inset-0 bg-slate-900/95 backdrop-blur-xl z-40 flex flex-col items-center justify-center gap-8 transition-transform duration-500 ease-in-out md:hidden ${
            isMobileMenuOpen ? "translate-x-0" : "translate-x-full"
          }`}
        >
          {["Villas", "About Us", "Contact"].map((item) => (
            <a
              key={item}
              href={`#${item.toLowerCase().replace(" ", "")}`}
              onClick={() => setIsMobileMenuOpen(false)}
              className="text-2xl font-serif text-white hover:text-gray-300 transition tracking-widest"
            >
              {item}
            </a>
          ))}
          <div className="flex gap-4 items-center mt-4">
            <button
              onClick={() => {
                if (currency !== "GHS") toggleCurrency();
              }}
              className={`px-4 py-2 border rounded-full flex items-center gap-2 ${
                currency === "GHS"
                  ? "bg-white text-slate-900"
                  : "text-white border-white/30"
              }`}
            >
              {currency === "GHS" && <Check size={14} />} GHS
            </button>
            <button
              onClick={() => {
                if (currency !== "USD") toggleCurrency();
              }}
              className={`px-4 py-2 border rounded-full flex items-center gap-2 ${
                currency === "USD"
                  ? "bg-white text-slate-900"
                  : "text-white border-white/30"
              }`}
            >
              {currency === "USD" && <Check size={14} />} USD
            </button>
          </div>

          {/* Mobile Book Now Button */}
          <button
            onClick={handleBookNowClick}
            className="mt-4 border border-white px-8 py-3 text-white uppercase tracking-widest text-sm hover:bg-white hover:text-slate-900 transition"
          >
            Book Now
          </button>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
