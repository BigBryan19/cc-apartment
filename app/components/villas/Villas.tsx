// components/villas/Villas.tsx
"use client";

import React, { useState, useEffect, useMemo } from "react";
import { LayoutGrid, Map, Loader2, SearchX } from "lucide-react";
import { useRouter } from "next/navigation";
import dynamic from "next/dynamic";
import { SearchFilters, VillaProps } from "./types";
import { EXCHANGE_RATE } from "./utils";
import VillaCard from "./VillaCard";
import { createClient } from "../../utils/supabase";

// Leaflet touches `window`, so the map is client-only.
const VillaMapView = dynamic(() => import("./VillaMapView"), {
  ssr: false,
  loading: () => (
    <div className="flex items-center justify-center gap-2 rounded-xl bg-[var(--color-canvas)] py-24 text-sm text-[var(--color-muted)]">
      <Loader2 className="animate-spin" size={18} />
      Loading map…
    </div>
  ),
});

interface VillasProps {
  currency: "GHS" | "USD";
  searchFilters: SearchFilters;
}

const Villas: React.FC<VillasProps> = ({ currency, searchFilters }) => {
  const router = useRouter();

  const [villasData, setVillasData] = useState<VillaProps[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [favorites, setFavorites] = useState<number[]>([]);
  const [viewMode, setViewMode] = useState<"grid" | "map">("grid");

  useEffect(() => {
    const fetchVillas = async () => {
      const supabase = createClient();
      const { data, error } = await supabase.from("villas").select("*");

      if (error) {
        console.error("Error fetching villas:", error);
      } else if (data) {
        type VillaRow = Omit<VillaProps, "hasPool"> & { has_pool?: boolean };
        const formatted: VillaProps[] = (data as VillaRow[]).map((v) => ({
          ...v,
          hasPool: Boolean(v.has_pool),
        }));
        setVillasData(formatted);
      }
      setIsLoading(false);
    };
    fetchVillas();
  }, []);

  useEffect(() => {
    const saved = localStorage.getItem("cosy-favorites");
    if (saved) setFavorites(JSON.parse(saved));
  }, []);

  const toggleFavorite = (id: number) => {
    const next = favorites.includes(id)
      ? favorites.filter((favId) => favId !== id)
      : [...favorites, id];
    setFavorites(next);
    localStorage.setItem("cosy-favorites", JSON.stringify(next));
  };

  const filteredVillas = useMemo(() => {
    return villasData.filter((villa) => {
      const locationMatch = searchFilters.location
        ? villa.location.toLowerCase().includes(searchFilters.location.toLowerCase())
        : true;
      const guestsMatch = villa.guests >= searchFilters.guests;

      let price = villa.price;
      if (currency === "USD") price = Math.round(villa.price / EXCHANGE_RATE);

      return locationMatch && guestsMatch && price <= searchFilters.maxPrice;
    });
  }, [searchFilters, currency, villasData]);

  const hasActiveFilters =
    Boolean(searchFilters.location) || searchFilters.maxPrice < 10000;

  return (
    <section id="villas" className="section-y bg-white">
      <div className="shell">
        {/* ---- Header ---- */}
        <div className="flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
          <div>
            <span className="eyebrow">Our homes</span>
            <h2 className="mt-2 text-3xl font-semibold tracking-tight text-[var(--color-ink)] sm:text-4xl">
              Top pick apartments
            </h2>
            <p className="mt-2 max-w-xl text-sm leading-relaxed text-[var(--color-muted)]">
              {isLoading
                ? "Loading available properties…"
                : hasActiveFilters
                  ? `${filteredVillas.length} of ${villasData.length} properties match your search.`
                  : "Handpicked, fully serviced apartments across Greater Accra and the Eastern Region."}
            </p>
          </div>

          {/* ---- View toggle ---- */}
          <div className="inline-flex shrink-0 self-start rounded-full border border-[var(--color-line)] p-1 md:self-auto">
            {(
              [
                { mode: "grid" as const, label: "Grid", Icon: LayoutGrid },
                { mode: "map" as const, label: "Map", Icon: Map },
              ]
            ).map(({ mode, label, Icon }) => (
              <button
                key={mode}
                onClick={() => setViewMode(mode)}
                aria-pressed={viewMode === mode}
                className={`flex items-center gap-2 rounded-full px-4 py-2 text-sm font-medium transition-colors ${
                  viewMode === mode
                    ? "bg-[var(--color-ink)] text-white"
                    : "text-[var(--color-muted)] hover:text-[var(--color-ink)]"
                }`}
              >
                <Icon size={15} />
                {label}
              </button>
            ))}
          </div>
        </div>

        {/* ---- Content ---- */}
        <div className="mt-10">
          {isLoading ? (
            <div className="grid grid-cols-1 gap-x-6 gap-y-10 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {[0, 1, 2, 3].map((i) => (
                <div key={i} className="animate-pulse">
                  <div className="aspect-[4/3] rounded-xl bg-[var(--color-canvas)]" />
                  <div className="mt-3 h-4 w-3/4 rounded bg-[var(--color-canvas)]" />
                  <div className="mt-2 h-3 w-1/2 rounded bg-[var(--color-canvas)]" />
                </div>
              ))}
            </div>
          ) : filteredVillas.length === 0 ? (
            <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-[var(--color-line)] px-6 py-20 text-center">
              <SearchX size={34} className="mb-4 text-[var(--color-faint)]" />
              <h3 className="text-lg font-semibold text-[var(--color-ink)]">
                No properties match those filters
              </h3>
              <p className="mt-1 max-w-sm text-sm text-[var(--color-muted)]">
                Try widening your budget or choosing a different location.
              </p>
            </div>
          ) : viewMode === "grid" ? (
            <div className="grid grid-cols-1 gap-x-6 gap-y-10 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {filteredVillas.map((villa) => (
                <VillaCard
                  key={villa.id}
                  {...villa}
                  currency={currency}
                  isFavorite={favorites.includes(villa.id)}
                  onToggleFavorite={toggleFavorite}
                  onClick={(v) => router.push(`/villas/${v.id}`)}
                />
              ))}
            </div>
          ) : (
            <VillaMapView
              villas={filteredVillas}
              onMarkerClick={(v) => router.push(`/villas/${v.id}`)}
            />
          )}
        </div>
      </div>
    </section>
  );
};

export default Villas;
