"use client";

import React from "react";
import {
  Heart,
  Play,
  Image as ImageIcon,
  MapPin,
  Users,
  BedDouble,
  Waves,
  Bath,
} from "lucide-react";
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
  return (
    <div
      onClick={() => onClick(villa as VillaProps)}
      className="bg-white rounded-2xl overflow-hidden shadow-lg hover:shadow-2xl hover:-translate-y-1 transition-all duration-300 group cursor-pointer relative h-full flex flex-col"
    >
      <div className="relative h-72 overflow-hidden shrink-0">
        {villa.video ? (
          <video
            src={villa.video}
            autoPlay
            loop
            muted
            playsInline
            className="w-full h-full object-cover group-hover:scale-105 transition duration-700"
          />
        ) : (
          <img
            src={villa.image}
            alt={villa.title}
            className="w-full h-full object-cover group-hover:scale-105 transition duration-700"
          />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-60 group-hover:opacity-40 transition-opacity" />
        <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300 z-20">
          <div className="bg-white/20 backdrop-blur-md p-4 rounded-full border border-white/50">
            {villa.video ? (
              <Play fill="white" className="text-white w-8 h-8 ml-1" />
            ) : (
              <ImageIcon className="text-white w-8 h-8" />
            )}
          </div>
        </div>
        <span className="absolute top-4 left-4 bg-white/95 backdrop-blur-md px-4 py-2 text-xs font-bold rounded-full shadow-sm z-20 transition-all">
          From{" "}
          <span className="font-serif text-base text-slate-900">
            {formatPrice(villa.price, currency)}
          </span>{" "}
          / daily
        </span>
        <button
          className={`absolute top-4 right-4 p-2.5 backdrop-blur-sm rounded-full transition z-20 ${
            isFavorite
              ? "bg-white text-red-500 shadow-md"
              : "bg-black/20 text-white hover:bg-white hover:text-red-500"
          }`}
          onClick={(e) => {
            e.stopPropagation();
            onToggleFavorite(villa.id);
          }}
        >
          <Heart size={20} fill={isFavorite ? "currentColor" : "none"} />
        </button>
      </div>
      <div className="p-6 flex flex-col flex-grow">
        <div className="flex items-center gap-1 text-[10px] font-bold text-blue-500 uppercase tracking-widest mb-2">
          <MapPin size={12} /> {villa.location}
        </div>
        <h3 className="text-2xl font-serif text-slate-900 mb-4 group-hover:text-blue-600 transition">
          {villa.title}
        </h3>
        <div className="mt-auto grid grid-cols-2 gap-y-3 text-xs text-gray-500 font-medium pt-4 border-t border-gray-100">
          <div className="flex items-center gap-2">
            <Users size={14} className="text-slate-400" /> {villa.guests} guests
          </div>
          <div className="flex items-center gap-2">
            <BedDouble size={14} className="text-slate-400" /> {villa.bedrooms}{" "}
            bedrooms
          </div>
          <div className="flex items-center gap-2">
            <Waves size={14} className="text-slate-400" />{" "}
            {villa.hasPool ? "Pool" : "No Pool"}
          </div>
          <div className="flex items-center gap-2">
            <Bath size={14} className="text-slate-400" /> {villa.bathrooms}{" "}
            baths
          </div>
        </div>
      </div>
    </div>
  );
};

export default VillaCard;
