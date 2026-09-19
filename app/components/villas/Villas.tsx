// components/villas/Villas.tsx
"use client";

import React, { useState, useEffect, useMemo } from "react";
import { LayoutGrid, Map, Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import dynamic from "next/dynamic"; // 1. IMPORT DYNAMIC
import { SearchFilters, VillaProps } from "./types";
import { EXCHANGE_RATE } from "./utils";
import VillaCard from "./VillaCard";
import { createClient } from "../../utils/supabase";

// 2. DYNAMICALLY IMPORT THE MAP AND DISABLE SSR
const VillaMapView = dynamic(() => import("./VillaMapView"), {
  ssr: false,
  loading: () => (
    <div className="flex justify-center items-center py-20 bg-slate-100 rounded-xl">
      <Loader2 className="animate-spin text-slate-400" size={32} />
      <span className="ml-2 text-slate-500">Loading map...</span>
    </div>
  ),
});

interface VillasProps {
  currency: "GHS" | "USD";
  searchFilters: SearchFilters;
}

const Villas: React.FC<VillasProps> = ({ currency, searchFilters }) => {
  const router = useRouter();

  // --- State for live Database Data ---
  const [villasData, setVillasData] = useState<VillaProps[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [favorites, setFavorites] = useState<number[]>([]);
  const [viewMode, setViewMode] = useState<"grid" | "map">("grid");

  // --- Fetch Data from Supabase ---
  useEffect(() => {
    const fetchVillas = async () => {
      const supabase = createClient();
      const { data, error } = await supabase.from("villas").select("*");

      if (error) {
        console.error("Error fetching villas:", error);
      } else if (data) {
        // Map the snake_case `has_pool` column onto the React interface.
        type VillaRow = Omit<VillaProps, "hasPool"> & { has_pool?: boolean };
        const formattedData: VillaProps[] = (data as VillaRow[]).map((v) => ({
          ...v,
          hasPool: Boolean(v.has_pool),
        }));
        setVillasData(formattedData);
      }
      setIsLoading(false);
    };
    fetchVillas();
  }, []);

  // --- Handle Favorites via LocalStorage ---
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

  // --- Advanced Filtering Logic ---
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
  }, [searchFilters, currency, villasData]);

  return (
    <section className="py-24 bg-stone-50 px-4 md:px-12 relative" id="villas">
      <div className="text-center mb-16">
        <h2 className="text-4xl md:text-5xl font-serif text-slate-900 mb-6">
          Top Pick Apartments
        </h2>
        <p className="text-gray-500 max-w-2xl mx-auto text-sm leading-relaxed mb-8">
          {isLoading
            ? "Loading amazing properties..."
            : `${filteredVillas.length} properties found based on your search.`}
        </p>

        {/* Map/Grid View Toggle Buttons */}
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

      {/* Show a loader while fetching data */}
      {isLoading ? (
        <div className="flex justify-center items-center py-20">
          <Loader2 className="animate-spin text-slate-900" size={48} />
        </div>
      ) : (
        <>
          {viewMode === "grid" ? (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-7xl mx-auto">
              {filteredVillas.map((villa) => (
                <VillaCard
                  key={villa.id}
                  {...villa}
                  currency={currency}
                  isFavorite={favorites.includes(villa.id)}
                  onToggleFavorite={toggleFavorite}
                  // Route to the new dynamic property page
                  onClick={(v) => router.push(`/villas/${v.id}`)}
                />
              ))}
            </div>
          ) : (
            <div className="max-w-5xl mx-auto">
              <VillaMapView
                villas={filteredVillas}
                // Route to the new dynamic property page from the map pin
                onMarkerClick={(v) => router.push(`/villas/${v.id}`)}
              />
            </div>
          )}

          {filteredVillas.length === 0 && !isLoading && (
            <div className="text-center py-12 text-gray-500">
              No villas found matching your criteria. Try adjusting your
              filters.
            </div>
          )}
        </>
      )}
    </section>
  );
};

export default Villas;
