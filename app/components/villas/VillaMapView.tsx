"use client";

import React from "react";
import { MapPin } from "lucide-react";
import { VillaProps } from "./types";

interface VillaMapViewProps {
  villas: VillaProps[];
  onMarkerClick: (v: VillaProps) => void;
}

const VillaMapView: React.FC<VillaMapViewProps> = ({
  villas,
  onMarkerClick,
}) => {
  return (
    <div className="w-full h-[600px] bg-slate-100 rounded-2xl relative overflow-hidden group cursor-grab active:cursor-grabbing">
      {/* Placeholder Map Image */}
      <img
        src="https://upload.wikimedia.org/wikipedia/commons/thumb/2/2c/Map_of_Accra.png/640px-Map_of_Accra.png"
        alt="Map of Accra"
        className="w-full h-full object-cover grayscale group-hover:grayscale-0 transition duration-500 opacity-50 group-hover:opacity-100"
      />
      <div className="absolute inset-0 bg-blue-900/10 pointer-events-none"></div>

      {/* Simulate Map Pins based on rough coordinates */}
      {villas.map((villa) => (
        <div
          key={villa.id}
          onClick={() => onMarkerClick(villa)}
          style={{
            top: `${50 - (villa.coordinates.lat - 5.6) * 100}%`,
            left: `${50 + (villa.coordinates.lng + 0.17) * 100}%`,
          }}
          className="absolute transform -translate-x-1/2 -translate-y-1/2 group/pin z-10"
        >
          <div className="bg-slate-900 text-white p-2 rounded-full shadow-lg hover:scale-110 transition cursor-pointer animate-bounce">
            <MapPin size={20} fill="white" />
          </div>
          {/* Hover Card on Map Pin */}
          <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 bg-white p-2 rounded-lg shadow-xl whitespace-nowrap opacity-0 group-hover/pin:opacity-100 transition pointer-events-none z-20">
            <img
              src={villa.image}
              alt={villa.title}
              className="w-24 h-16 object-cover rounded-md mb-2"
            />
            <p className="font-bold text-xs">{villa.title}</p>
            <p className="text-[10px] text-blue-600">{villa.location}</p>
          </div>
        </div>
      ))}

      <div className="absolute bottom-4 left-4 bg-white/90 px-4 py-2 rounded-md text-xs font-bold shadow-sm pointer-events-none">
        Interactive Map View (Demo)
      </div>
    </div>
  );
};

export default VillaMapView;
