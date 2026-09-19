"use client";

import React, { useEffect, useState } from "react";
import { VillaProps } from "./types";
import { formatPrice } from "./utils";
import { MapContainer, TileLayer, Marker, Popup, useMap } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import L from "leaflet";

interface VillaMapViewProps {
  villas: VillaProps[];
  onMarkerClick: (v: VillaProps) => void;
  currency?: "GHS" | "USD";
}

// --- NEW: Helper Component to Auto-Zoom and Center the Map ---
const MapBoundsFit = ({ villas }: { villas: VillaProps[] }) => {
  const map = useMap();

  useEffect(() => {
    if (villas.length === 0) return;

    // Create a bounding box that encompasses all villa coordinates
    const bounds = L.latLngBounds(
      villas.map((v) => [v.coordinates.lat, v.coordinates.lng]),
    );

    // Animate the map to fit exactly these bounds with a little padding
    map.flyToBounds(bounds, { padding: [50, 50], maxZoom: 14 });
  }, [villas, map]);

  return null; // This component doesn't render anything visually
};

const VillaMapView: React.FC<VillaMapViewProps> = ({
  villas,
  onMarkerClick,
  currency = "GHS",
}) => {
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);

    delete (L.Icon.Default.prototype as { _getIconUrl?: unknown })
      ._getIconUrl;
    L.Icon.Default.mergeOptions({
      iconRetinaUrl:
        "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
      iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
      shadowUrl:
        "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
    });
  }, []);

  if (!isMounted) {
    return (
      <div className="w-full h-[600px] bg-slate-100 rounded-2xl flex items-center justify-center">
        <p className="text-slate-500 font-bold uppercase tracking-widest text-xs animate-pulse">
          Loading Map...
        </p>
      </div>
    );
  }

  // Fallback center if the array is empty (Accra)
  const centerLat = 5.6037;
  const centerLng = -0.187;

  return (
    <div className="w-full h-[600px] bg-slate-100 rounded-2xl relative overflow-hidden shadow-inner border border-slate-200 z-0">
      <MapContainer
        center={[centerLat, centerLng]}
        zoom={11}
        scrollWheelZoom={false}
        className="w-full h-full z-0"
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
          url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png"
        />

        {/* --- NEW: Call the auto-fitter component here --- */}
        <MapBoundsFit villas={villas} />

        {villas.map((villa) => (
          <Marker
            key={villa.id}
            position={[villa.coordinates.lat, villa.coordinates.lng]}
          >
            <Popup className="custom-popup">
              <div className="text-center w-48 p-1">
                <img
                  src={villa.images?.[0] || villa.image}
                  alt={villa.title}
                  className="w-full h-28 object-cover rounded-lg mb-3 shadow-sm"
                />
                <p className="font-serif font-bold text-slate-900 text-sm leading-tight mb-1">
                  {villa.title}
                </p>
                <p className="text-[10px] text-slate-500 uppercase tracking-wider mb-2 line-clamp-1">
                  {villa.location}
                </p>
                <p className="font-bold text-blue-600 text-sm mb-3">
                  {formatPrice(villa.price, currency)}{" "}
                  <span className="text-[10px] text-slate-400 font-normal">
                    /night
                  </span>
                </p>
                <button
                  onClick={() => onMarkerClick(villa)}
                  className="w-full bg-slate-900 text-white py-2 rounded-md text-[10px] font-bold uppercase tracking-widest hover:bg-slate-800 transition"
                >
                  View Details
                </button>
              </div>
            </Popup>
          </Marker>
        ))}
      </MapContainer>
    </div>
  );
};

export default VillaMapView;
