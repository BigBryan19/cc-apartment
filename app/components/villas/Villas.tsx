// components/villas/Villas.tsx
"use client";

import React, { useState, useEffect, useMemo } from "react";
import { LayoutGrid, Map } from "lucide-react";
import { SearchFilters, VillaProps } from "./types";
import { villasData } from "./villasData";
import { EXCHANGE_RATE } from "./utils";
import VillaCard from "./VillaCard";
import VillaMapView from "./VillaMapView";
import VillaModal from "./VillaModal";

interface VillasProps {
  currency: "GHS" | "USD";
  searchFilters: SearchFilters;
}

const Villas: React.FC<VillasProps> = ({ currency, searchFilters }) => {
  const [selectedVilla, setSelectedVilla] = useState<VillaProps | null>(null);
  const [favorites, setFavorites] = useState<number[]>([]);
  const [viewMode, setViewMode] = useState<"grid" | "map">("grid");

  useEffect(() => {
    const saved = localStorage.getItem("cosy-favorites");
    if (saved) setFavorites(JSON.parse(saved));
  }, []);

  const toggleFavorite = (id: number) => {
    const newFavorites = favorites.includes(id)
      ? favorites.filter((favId) => favId !== id)
      : [...favorites, id];
    setFavorites(newFavorites);
    localStorage.setItem("cosy-favorites", JSON.stringify(newFavorites));
  };

  const filteredVillas = useMemo(() => {
    return villasData.filter((villa) => {
      const locationMatch = searchFilters.location
        ? villa.location
            .toLowerCase()
            .includes(searchFilters.location.toLowerCase())
        : true;

      const guestsMatch = villa.guests >= searchFilters.guests;

      let villaPriceInSelectedCurrency = villa.price;
      if (currency === "USD") {
        villaPriceInSelectedCurrency = Math.round(villa.price / EXCHANGE_RATE);
      }

      const priceMatch = villaPriceInSelectedCurrency <= searchFilters.maxPrice;

      return locationMatch && guestsMatch && priceMatch;
    });
  }, [searchFilters, currency]);

  return (
    <>
      <section className="py-24 bg-stone-50 px-4 md:px-12 relative" id="villas">
        <div className="text-center mb-16">
          <h2 className="text-4xl md:text-5xl font-serif text-slate-900 mb-6">
            Top Pick Apartments
          </h2>
          <p className="text-gray-500 max-w-2xl mx-auto text-sm leading-relaxed mb-8">
            {filteredVillas.length} properties found based on your search.
          </p>

          <div className="inline-flex bg-slate-200 p-1 rounded-lg shadow-inner">
            <button
              onClick={() => setViewMode("grid")}
              className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-bold transition ${viewMode === "grid" ? "bg-white shadow-sm text-slate-900" : "text-slate-500 hover:text-slate-700"}`}
            >
              <LayoutGrid size={16} /> Grid View
            </button>
            <button
              onClick={() => setViewMode("map")}
              className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-bold transition ${viewMode === "map" ? "bg-white shadow-sm text-slate-900" : "text-slate-500 hover:text-slate-700"}`}
            >
              <Map size={16} /> Map View
            </button>
          </div>
        </div>

        {viewMode === "grid" ? (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-7xl mx-auto">
            {filteredVillas.map((villa) => (
              <VillaCard
                key={villa.id}
                {...villa}
                currency={currency}
                isFavorite={favorites.includes(villa.id)}
                onToggleFavorite={toggleFavorite}
                onClick={(v) => setSelectedVilla(v)}
              />
            ))}
          </div>
        ) : (
          <div className="max-w-5xl mx-auto">
            <VillaMapView
              villas={filteredVillas}
              onMarkerClick={(v) => setSelectedVilla(v)}
            />
          </div>
        )}

        {filteredVillas.length === 0 && (
          <div className="text-center py-12 text-gray-500">
            No villas found matching your criteria. Try adjusting your filters.
          </div>
        )}
      </section>

      {selectedVilla && (
        <VillaModal
          villa={selectedVilla}
          currency={currency}
          onClose={() => setSelectedVilla(null)}
        />
      )}
    </>
  );
};

export default Villas;
