// app/components/Hero.tsx
"use client";

import React, { useState, useEffect } from "react";
import { Search, MapPin, Users, Wallet, ChevronDown } from "lucide-react";
import Navbar from "./Navbar";
import { SearchFilters } from "./villas/types";

interface HeroProps {
  currency: "GHS" | "USD";
  toggleCurrency: () => void;
  setSearchFilters: React.Dispatch<React.SetStateAction<SearchFilters>>;
}

const heroSlides = [
  { id: 1, image: "/Lake1.jpg", location: "LAKESIDE" },
  { id: 2, image: "/Aburi1.jpeg", location: "ABURI" },
  { id: 3, image: "/Adenta1.jpg", location: "ADENTA" },
];

const ANY_PRICE = 10000;

const Hero: React.FC<HeroProps> = ({
  currency,
  toggleCurrency,
  setSearchFilters,
}) => {
  const [location, setLocation] = useState("");
  const [guests, setGuests] = useState(2);
  const [maxPrice, setMaxPrice] = useState(ANY_PRICE);

  const [currentSlide, setCurrentSlide] = useState(0);
  const [displayText, setDisplayText] = useState("");

  // Background rotation
  useEffect(() => {
    const id = setInterval(() => {
      setCurrentSlide((prev) => (prev === heroSlides.length - 1 ? 0 : prev + 1));
    }, 7000);
    return () => clearInterval(id);
  }, []);

  // Typewriter headline
  useEffect(() => {
    const fullText = `Be our guest in ${heroSlides[currentSlide].location}`;
    setDisplayText("");
    let i = 0;
    const id = setInterval(() => {
      if (i < fullText.length) {
        setDisplayText(fullText.substring(0, i + 1));
        i += 1;
      } else {
        clearInterval(id);
      }
    }, 55);
    return () => clearInterval(id);
  }, [currentSlide]);

  const symbol = currency === "GHS" ? "₵" : "$";
  // Price brackets track the active currency so the filter always matches.
  const brackets =
    currency === "GHS" ? [1000, 2000, 3500, 5000] : [100, 150, 250, 400];

  const handleSearch = () => {
    setSearchFilters({ location, guests, maxPrice });
    document.getElementById("villas")?.scrollIntoView({ behavior: "smooth" });
  };

  /* Shared segment shell: label on top, control underneath — the Airbnb
     ".field" pattern. */
  const segment =
    "group relative flex-1 min-w-0 px-8 py-3.5 text-left transition-colors";
  const label =
    "block text-[11px] font-bold uppercase tracking-[0.08em] text-[var(--color-ink)] mb-0.5";

  return (
    <section className="relative min-h-[92svh] w-full overflow-hidden bg-[#111]">
      {/* Background slider */}
      {heroSlides.map((slide, index) => (
        <div
          key={slide.id}
          className={`absolute inset-0 transition-opacity duration-[1200ms] ease-in-out ${
            index === currentSlide ? "opacity-100" : "opacity-0"
          }`}
          aria-hidden={index !== currentSlide}
        >
          <img
            src={slide.image}
            alt={`Luxury apartment in ${slide.location}`}
            className={`h-full w-full object-cover ${
              index === currentSlide ? "animate-kenburns" : ""
            }`}
          />
        </div>
      ))}

      {/* Legibility scrims — the mid-stop is kept dark enough that the
          sub-heading stays readable over bright areas of the photo. */}
      <div className="absolute inset-0 bg-gradient-to-b from-black/60 via-black/45 to-black/70" />

      {/* Deliberately NOT wrapped in a `relative z-20` div. Such a wrapper
          creates a stacking context that traps the navbar's own z-50 inside
          it, leaving the navbar competing at level 20 against the page
          sections — so AboutUs's collage images (z-30) painted straight over
          it while scrolling. The navbar is `fixed` and layers above the scrim
          here on its own, so it needs no help from a parent. */}
      <Navbar currency={currency} toggleCurrency={toggleCurrency} />

      <div className="relative z-10 shell flex min-h-[92svh] flex-col items-center justify-center pt-28 pb-16 text-center">
        <span className="mb-5 inline-flex items-center gap-2 rounded-full border border-white/25 bg-white/10 px-4 py-1.5 text-[11px] font-semibold uppercase tracking-[0.14em] text-white backdrop-blur-md">
          Accra · Aburi · Adenta
        </span>

        <h1 className="font-display text-[2.6rem] leading-[1.05] text-white drop-shadow-[0_2px_16px_rgba(0,0,0,0.45)] sm:text-6xl lg:text-7xl min-h-[3.5rem] sm:min-h-[4.5rem] flex items-center justify-center">
          <span>{displayText}</span>
          <span className="ml-1.5 inline-block h-[0.85em] w-[3px] animate-pulse bg-white/90 align-middle" />
        </h1>

        <p className="mt-5 max-w-xl text-sm leading-relaxed text-white/85 sm:text-base">
          Short let apartments in Accra and Aburi — fully furnished, privately
          managed, with private pools, fast Wi-Fi and hotel-grade housekeeping.
        </p>

        {/* ---------------- Search ---------------- */}
        <div className="mt-9 w-full max-w-4xl">
          <div className="hidden md:flex items-stretch rounded-full bg-white p-2 shadow-[var(--shadow-pill)]">
            <div className={`${segment} rounded-full hover:bg-[var(--color-canvas)]`}>
              <label htmlFor="hero-location" className={label}>
                Where
              </label>
              <div className="relative">
                <select
                  id="hero-location"
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  className="w-full cursor-pointer appearance-none bg-transparent pr-5 text-sm text-[var(--color-muted)] outline-none"
                >
                  <option value="">Anywhere in Ghana</option>
                  <option value="Aburi">Aburi, Eastern Region</option>
                  <option value="Lakeside">Lakeside, Greater Accra</option>
                  <option value="Adenta">Adenta, Greater Accra</option>
                </select>
                <ChevronDown
                  size={14}
                  className="pointer-events-none absolute right-0 top-1/2 -translate-y-1/2 text-[var(--color-faint)]"
                />
              </div>
            </div>

            <div className="my-2 w-px bg-[var(--color-line-soft)]" />

            <div className={`${segment} rounded-full hover:bg-[var(--color-canvas)]`}>
              <label htmlFor="hero-guests" className={label}>
                Guests
              </label>
              <div className="relative">
                <select
                  id="hero-guests"
                  value={guests}
                  onChange={(e) => setGuests(Number(e.target.value))}
                  className="w-full cursor-pointer appearance-none bg-transparent pr-5 text-sm text-[var(--color-muted)] outline-none"
                >
                  <option value="1">1 guest</option>
                  <option value="2">2 guests</option>
                  <option value="4">4 guests</option>
                  <option value="6">6+ guests</option>
                </select>
                <ChevronDown
                  size={14}
                  className="pointer-events-none absolute right-0 top-1/2 -translate-y-1/2 text-[var(--color-faint)]"
                />
              </div>
            </div>

            <div className="my-2 w-px bg-[var(--color-line-soft)]" />

            <div className={`${segment} rounded-full hover:bg-[var(--color-canvas)]`}>
              <label htmlFor="hero-price" className={label}>
                Nightly budget
              </label>
              <div className="relative">
                <select
                  id="hero-price"
                  value={maxPrice}
                  onChange={(e) => setMaxPrice(Number(e.target.value))}
                  className="w-full cursor-pointer appearance-none bg-transparent pr-5 text-sm text-[var(--color-muted)] outline-none"
                >
                  <option value={ANY_PRICE}>Any price</option>
                  {brackets.map((b) => (
                    <option key={b} value={b}>
                      Up to {symbol}
                      {b.toLocaleString()}
                    </option>
                  ))}
                </select>
                <ChevronDown
                  size={14}
                  className="pointer-events-none absolute right-0 top-1/2 -translate-y-1/2 text-[var(--color-faint)]"
                />
              </div>
            </div>

            <button
              onClick={handleSearch}
              className="btn-accent ml-2 flex shrink-0 items-center gap-2 rounded-full px-7 text-sm"
              aria-label="Search properties"
            >
              <Search size={17} />
              <span>Search</span>
            </button>
          </div>

          {/* Mobile: stacked card */}
          <div className="md:hidden rounded-2xl bg-white p-3 shadow-[var(--shadow-pill)] text-left">
            <div className="flex items-center gap-3 px-2 py-2.5 border-b border-[var(--color-line-soft)]">
              <MapPin size={17} className="text-[var(--color-muted)] shrink-0" />
              <div className="flex-1 min-w-0">
                <label htmlFor="hero-location-m" className={label}>
                  Where
                </label>
                <select
                  id="hero-location-m"
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  className="w-full appearance-none bg-transparent text-sm text-[var(--color-ink)] outline-none"
                >
                  <option value="">Anywhere in Ghana</option>
                  <option value="Aburi">Aburi, Eastern Region</option>
                  <option value="Lakeside">Lakeside, Greater Accra</option>
                  <option value="Adenta">Adenta, Greater Accra</option>
                </select>
              </div>
            </div>

            <div className="flex items-center gap-3 px-2 py-2.5 border-b border-[var(--color-line-soft)]">
              <Users size={17} className="text-[var(--color-muted)] shrink-0" />
              <div className="flex-1 min-w-0">
                <label htmlFor="hero-guests-m" className={label}>
                  Guests
                </label>
                <select
                  id="hero-guests-m"
                  value={guests}
                  onChange={(e) => setGuests(Number(e.target.value))}
                  className="w-full appearance-none bg-transparent text-sm text-[var(--color-ink)] outline-none"
                >
                  <option value="1">1 guest</option>
                  <option value="2">2 guests</option>
                  <option value="4">4 guests</option>
                  <option value="6">6+ guests</option>
                </select>
              </div>
            </div>

            <div className="flex items-center gap-3 px-2 py-2.5">
              <Wallet size={17} className="text-[var(--color-muted)] shrink-0" />
              <div className="flex-1 min-w-0">
                <label htmlFor="hero-price-m" className={label}>
                  Nightly budget
                </label>
                <select
                  id="hero-price-m"
                  value={maxPrice}
                  onChange={(e) => setMaxPrice(Number(e.target.value))}
                  className="w-full appearance-none bg-transparent text-sm text-[var(--color-ink)] outline-none"
                >
                  <option value={ANY_PRICE}>Any price</option>
                  {brackets.map((b) => (
                    <option key={b} value={b}>
                      Up to {symbol}
                      {b.toLocaleString()}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <button
              onClick={handleSearch}
              className="btn-accent mt-2 flex w-full items-center justify-center gap-2 rounded-xl py-3.5 text-sm"
            >
              <Search size={17} /> Search
            </button>
          </div>
        </div>

        {/* Slide indicators */}
        <div className="mt-8 flex items-center gap-2">
          {heroSlides.map((slide, index) => (
            <button
              key={slide.id}
              onClick={() => setCurrentSlide(index)}
              aria-label={`Show ${slide.location}`}
              className={`h-1.5 rounded-full transition-all duration-300 ${
                index === currentSlide
                  ? "w-8 bg-white"
                  : "w-1.5 bg-white/45 hover:bg-white/70"
              }`}
            />
          ))}
        </div>
      </div>
    </section>
  );
};

export default Hero;
