"use client";

import React, { useState, useEffect } from "react";
import { Menu, X } from "lucide-react"; // Make sure you have lucide-react installed

const Navbar: React.FC = () => {
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  // Handle scroll effect
  useEffect(() => {
    const handleScroll = () => {
      if (window.scrollY > 50) {
        setIsScrolled(true);
      } else {
        setIsScrolled(false);
      }
    };

    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <nav
      className={`fixed top-0 left-0 w-full z-50 transition-all duration-300 ${
        isScrolled
          ? "bg-slate-900/90 backdrop-blur-md py-4 shadow-lg"
          : "bg-transparent py-6"
      }`}
    >
      <div className="max-w-7xl mx-auto px-6 md:px-12 flex justify-between items-center">
        {/* Logo Area */}
        <div className="flex items-center gap-2 cursor-pointer z-50">
          {/* Replace this with your actual image path */}
          <img
            src="/cc-horinzontal.png"
            alt="COSY CREST"
            className="h-8 md:h-10"
          />
          {/* Fallback text if image missing (optional) */}
          {/* <span className="text-white font-serif font-bold text-xl tracking-widest">COSY CREST</span> */}
        </div>

        {/* Desktop Navigation */}
        <div className="hidden md:flex items-center gap-8 text-xs tracking-[0.2em] font-medium uppercase text-white">
          {["Villas", "About Us", "Contact"].map((item) => (
            <a
              key={item}
              href={`#${item.toLowerCase().replace(" ", "")}`}
              className="relative group hover:text-gray-300 transition-colors py-2"
            >
              {item}
              {/* animated underline */}
              <span className="absolute bottom-0 left-0 w-0 h-0.5 bg-white transition-all duration-300 group-hover:w-full"></span>
            </a>
          ))}

          <button className="border border-white/30 px-5 py-2 hover:bg-white hover:text-slate-900 transition duration-300 rounded-sm">
            Book Now
          </button>
        </div>

        {/* Mobile Menu Button */}
        <button
          className="md:hidden text-white z-50 p-2"
          onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
        >
          {isMobileMenuOpen ? <X size={28} /> : <Menu size={28} />}
        </button>

        {/* Mobile Navigation Overlay */}
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
          <button className="mt-4 border border-white px-8 py-3 text-white uppercase tracking-widest text-sm hover:bg-white hover:text-slate-900 transition">
            Book Now
          </button>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
