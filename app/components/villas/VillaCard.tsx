// app/components/villas/VillaCard.tsx
"use client";

import React from "react";
import { Heart, Play, MapPin, Star, Users, BedDouble, Bath } from "lucide-react";
import { VillaProps } from "./types";
import { formatPrice } from "./utils";

interface VillaCardProps extends VillaProps {
  onClick: (villa: VillaProps) => void;
  currency: "GHS" | "USD";
  isFavorite: boolean;
  onToggleFavorite: (id: number) => void;
}

const VillaCard: React.FC<VillaCardProps> = ({
  onClick,
  currency,
  isFavorite,
  onToggleFavorite,
  ...villa
}) => {
  const data = villa as VillaProps;

  return (
    <article
      onClick={() => onClick(data)}
      className="group cursor-pointer flex flex-col"
    >
      {/* ---- Media ---- */}
      <div className="relative aspect-[4/3] overflow-hidden rounded-xl bg-[var(--color-canvas)]">
        {data.video ? (
          <video
            src={data.video}
            autoPlay
            loop
            muted
            playsInline
            className="h-full w-full object-cover transition-transform duration-500 ease-out group-hover:scale-[1.05]"
          />
        ) : (
          <img
            src={data.image}
            alt={data.title}
            loading="lazy"
            className="h-full w-full object-cover transition-transform duration-500 ease-out group-hover:scale-[1.05]"
          />
        )}

        {/* Pool badge — a real attribute, not decoration */}
        {data.hasPool && (
          <span className="absolute left-3 top-3 rounded-full bg-white/95 px-2.5 py-1 text-[11px] font-semibold text-[var(--color-ink)] backdrop-blur-sm">
            Pool
          </span>
        )}

        {/* Video affordance */}
        {data.video && (
          <span className="absolute bottom-3 left-3 flex items-center gap-1.5 rounded-full bg-black/55 px-2.5 py-1 text-[11px] font-semibold text-white backdrop-blur-sm">
            <Play size={11} fill="currentColor" /> Tour
          </span>
        )}

        <button
          onClick={(e) => {
            e.stopPropagation();
            onToggleFavorite(data.id);
          }}
          aria-label={isFavorite ? "Remove from favourites" : "Save to favourites"}
          aria-pressed={isFavorite}
          className="absolute right-3 top-3 rounded-full p-2 transition-transform duration-200 hover:scale-110 active:scale-95"
        >
          <Heart
            size={22}
            className={
              isFavorite
                ? "fill-[var(--color-accent)] text-[var(--color-accent)] drop-shadow-sm"
                : "fill-black/25 text-white drop-shadow-sm"
            }
          />
        </button>
      </div>

      {/* ---- Details (below the image, never overlaid) ---- */}
      <div className="pt-3">
        <div className="flex items-start justify-between gap-3">
          <h3 className="truncate text-[15px] font-semibold leading-snug text-[var(--color-ink)]">
            {data.title}
          </h3>
          <span className="flex shrink-0 items-center gap-1 text-[13px] text-[var(--color-ink-soft)]">
            <Star size={12} className="fill-[var(--color-ink)] text-[var(--color-ink)]" />
            4.9
          </span>
        </div>

        <p className="mt-0.5 flex items-center gap-1 truncate text-[13px] text-[var(--color-muted)]">
          <MapPin size={12} className="shrink-0" />
          {data.location}
        </p>

        <p className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-[13px] text-[var(--color-muted)]">
          <span className="flex items-center gap-1">
            <Users size={12} /> {data.guests} guests
          </span>
          <span className="flex items-center gap-1">
            <BedDouble size={12} /> {data.bedrooms} bed
          </span>
          <span className="flex items-center gap-1">
            <Bath size={12} /> {data.bathrooms} bath
          </span>
        </p>

        <p className="mt-2 text-[15px] text-[var(--color-ink)]">
          <span className="font-semibold">
            {formatPrice(data.price, currency)}
          </span>
          <span className="text-[var(--color-muted)]"> / night</span>
        </p>
      </div>
    </article>
  );
};

export default VillaCard;
