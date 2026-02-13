"use client";

import React, { useState, useEffect } from "react";
import {
  Heart,
  Users,
  BedDouble,
  Bath,
  // Square, // Removed Square icon
  X,
  Play,
  MapPin,
  Wifi,
  Utensils,
  Waves, // Using Waves for Pool
  Sofa,
  Tv,
  CheckCircle,
  Tag,
} from "lucide-react";

// --- Types ---
interface VillaProps {
  id: number;
  image?: string;
  video?: string;
  price: string | number;
  title: string;
  location: string;
  guests: number;
  bedrooms: number;
  // area: number; // Removed Area
  hasPool: boolean; // Added Pool boolean
  bathrooms: number;
  description: string;
  amenities?: string[];
  rates?: { option: string; amount: string | number }[];
}

// --- Helper: Select Icon based on text ---
const getAmenityIcon = (text: string) => {
  const lower = text.toLowerCase();
  const iconClass = "w-5 h-5 mx-auto mb-2 text-slate-500";

  if (lower.includes("wi-fi") || lower.includes("wifi"))
    return <Wifi className={iconClass} />;
  if (lower.includes("kitchen")) return <Utensils className={iconClass} />;
  if (lower.includes("pool")) return <Waves className={iconClass} />;
  if (lower.includes("hall") || lower.includes("furnished"))
    return <Sofa className={iconClass} />;
  if (lower.includes("television") || lower.includes("tv"))
    return <Tv className={iconClass} />;

  return <CheckCircle className={iconClass} />;
};

// --- Component: Villa Card ---
interface VillaCardProps extends VillaProps {
  onClick: (villa: VillaProps) => void;
}

const VillaCard: React.FC<VillaCardProps> = ({ onClick, ...villa }) => (
  <div
    onClick={() => onClick(villa)}
    className="bg-white rounded-2xl overflow-hidden shadow-lg hover:shadow-2xl hover:-translate-y-1 transition-all duration-300 group cursor-pointer relative h-full flex flex-col"
  >
    {/* Image/Video Container */}
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
          <Play fill="white" className="text-white w-8 h-8 ml-1" />
        </div>
      </div>

      <span className="absolute top-4 left-4 bg-white/95 backdrop-blur-md px-4 py-2 text-xs font-bold rounded-full shadow-sm z-20">
        From{" "}
        <span className="font-serif text-base text-slate-900">
          ₵{villa.price}
        </span>{" "}
        / daily
      </span>

      <button
        className="absolute top-4 right-4 p-2.5 bg-black/20 hover:bg-white backdrop-blur-sm rounded-full text-white hover:text-red-500 transition z-20"
        onClick={(e) => {
          e.stopPropagation();
        }}
      >
        <Heart size={20} />
      </button>
    </div>

    {/* Content */}
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
        {/* REPLACED AREA WITH POOL */}
        <div className="flex items-center gap-2">
          <Waves size={14} className="text-slate-400" />{" "}
          {villa.hasPool ? "Pool" : "No Pool"}
        </div>
        <div className="flex items-center gap-2">
          <Bath size={14} className="text-slate-400" /> {villa.bathrooms} baths
        </div>
      </div>
    </div>
  </div>
);

// --- Component: Modal Overlay ---
const VillaModal = ({
  villa,
  onClose,
}: {
  villa: VillaProps;
  onClose: () => void;
}) => {
  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "unset";
    };
  }, []);

  if (!villa) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-slate-900/80 backdrop-blur-sm transition-opacity"
        onClick={onClose}
      />

      <div className="relative bg-white rounded-2xl overflow-hidden shadow-2xl w-full max-w-5xl max-h-[90vh] flex flex-col md:flex-row animate-in fade-in zoom-in duration-300">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 z-50 p-2 bg-black/50 hover:bg-black/70 text-white rounded-full backdrop-blur-md transition"
        >
          <X size={24} />
        </button>

        <div className="w-full md:w-2/3 bg-black flex items-center justify-center shrink-0 h-64 md:h-auto">
          {villa.video ? (
            <video
              src={villa.video}
              controls
              autoPlay
              className="w-full h-full object-contain"
            />
          ) : (
            <img
              src={villa.image}
              alt={villa.title}
              className="w-full h-full object-cover"
            />
          )}
        </div>

        <div className="w-full md:w-1/3 p-8 flex flex-col flex-1 overflow-y-auto bg-white">
          <div className="mb-6">
            <span className="text-blue-600 text-xs font-bold tracking-widest uppercase mb-2 block">
              {villa.location}
            </span>
            <h2 className="text-3xl font-serif text-slate-900 mb-2">
              {villa.title}
            </h2>

            {villa.rates ? (
              <div className="mt-4 bg-slate-50 p-4 rounded-xl border border-slate-100">
                <div className="flex items-center gap-2 mb-3">
                  <Tag size={14} className="text-slate-500" />
                  <span className="text-xs font-bold uppercase tracking-widest text-slate-500">
                    Available Rates
                  </span>
                </div>
                <div className="space-y-3">
                  {villa.rates.map((rate, idx) => (
                    <div
                      key={idx}
                      className="flex justify-between items-center text-sm border-b border-slate-200 last:border-0 pb-2 last:pb-0"
                    >
                      <span className="text-slate-600 font-medium">
                        {rate.option}
                      </span>
                      <span className="font-serif text-slate-900 font-bold text-lg">
                        ₵{rate.amount}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="text-xl font-medium text-slate-700 mt-2">
                ₵{villa.price}{" "}
                <span className="text-sm text-gray-400 font-normal">
                  / night
                </span>
              </div>
            )}
          </div>

          <p className="text-gray-600 leading-relaxed text-sm mb-8">
            {villa.description}
          </p>

          {/* Amenities Grid */}
          {villa.amenities ? (
            <div className="grid grid-cols-2 gap-4 mb-8">
              {villa.amenities.map((item, index) => (
                <div
                  key={index}
                  className="bg-slate-50 p-4 rounded-lg text-center flex flex-col items-center justify-center h-24 hover:bg-slate-100 transition duration-300 border border-transparent hover:border-slate-200"
                >
                  {getAmenityIcon(item)}
                  <span className="text-xs font-bold text-slate-700 leading-tight">
                    {item}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            /* Fallback Stats */
            <div className="grid grid-cols-2 gap-4 mb-8">
              <div className="bg-slate-50 p-3 rounded-lg text-center">
                <Users className="w-5 h-5 mx-auto mb-1 text-slate-400" />
                <span className="text-xs font-bold text-slate-700">
                  {villa.guests} Guests
                </span>
              </div>
              <div className="bg-slate-50 p-3 rounded-lg text-center">
                <BedDouble className="w-5 h-5 mx-auto mb-1 text-slate-400" />
                <span className="text-xs font-bold text-slate-700">
                  {villa.bedrooms} Beds
                </span>
              </div>
              <div className="bg-slate-50 p-3 rounded-lg text-center">
                <Bath className="w-5 h-5 mx-auto mb-1 text-slate-400" />
                <span className="text-xs font-bold text-slate-700">
                  {villa.bathrooms} Baths
                </span>
              </div>
              {/* REPLACED AREA WITH POOL HERE TOO */}
              <div className="bg-slate-50 p-3 rounded-lg text-center">
                <Waves className="w-5 h-5 mx-auto mb-1 text-slate-400" />
                <span className="text-xs font-bold text-slate-700">
                  {villa.hasPool ? "Pool" : "-"}
                </span>
              </div>
            </div>
          )}

          <div className="mt-auto pt-4">
            <button className="w-full bg-slate-900 text-white py-4 font-bold uppercase tracking-widest text-xs hover:bg-slate-800 transition rounded-lg">
              Book This Villa
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

// --- Component: Main Section ---
const Villas: React.FC = () => {
  const [selectedVilla, setSelectedVilla] = useState<VillaProps | null>(null);

  const villasData: VillaProps[] = [
    {
      id: 1,
      title: "Lakeside Serenity",
      location: "Greater Accra • Lakeside",
      price: "2000",
      guests: 4,
      bedrooms: 4,
      hasPool: true, // Replaced area with hasPool
      bathrooms: 5,
      video: "/lakeside.mp4",
      description:
        "Experience comfort, privacy, and elegance in this beautifully furnished apartment located in the serene and secure Lakeside Estate. Whether you're visiting for business, vacation, or a short getaway, this space offers the perfect blend of relaxation and convenience.",
      amenities: [
        "Free Wi-Fi",
        "Kitchen",
        "Pool",
        "Well-furnished hall",
        "Television in all rooms",
      ],
      rates: [
        { option: "Two bedrooms", amount: "2000" },
        { option: "Whole apartment (4 bedrooms)", amount: "3500" },
      ],
    },
    {
      id: 2,
      title: "Aburi Mountain Retreat",
      location: "Eastern Region • Aburi",
      price: "600",
      guests: 4,
      bedrooms: 4,
      hasPool: true, // Replaced area with hasPool
      bathrooms: 5,
      video: "/aburi.mp4",
      description:
        "Nestled in the serene and refreshing environment of Aburi, just a short distance from Aburi Girls School, this beautifully furnished apartment offers comfort, privacy, and relaxation in a peaceful setting. Perfect for short stays, weekend getaways, business trips, or family vacations, the space combines modern living with a calm, scenic atmosphere.",
      amenities: [
        "Free Wi-Fi",
        "Kitchen",
        "Pool",
        "Well-furnished hall",
        "Television in all rooms",
      ],
      rates: [
        { option: "Single bedroom", amount: "600" },
        { option: "Studio", amount: "800" },
        { option: "Two bedrooms", amount: "2000" },
        { option: "Whole apartment (4 bedrooms)", amount: "3500" },
      ],
    },
  ];

  return (
    <>
      <section className="py-24 bg-stone-50 px-4 md:px-12" id="villas">
        <div className="text-center mb-16">
          <h2 className="text-4xl md:text-5xl font-serif text-slate-900 mb-6">
            Top Pick Villas
          </h2>
          <p className="text-gray-500 max-w-2xl mx-auto text-sm leading-relaxed">
            Offer the perfect blend of luxury, comfort, and serenity. Carefully
            selected for their premium amenities, stylish interiors, and prime
            locations, these villas provide an exceptional stay experience
            whether for relaxation, family getaways, or special occasions. Enjoy
            privacy, convenience, and unforgettable comfort in every stay.
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-10 max-w-4xl mx-auto">
          {villasData.map((villa) => (
            <VillaCard
              key={villa.id}
              {...villa}
              onClick={(v) => setSelectedVilla(v)}
            />
          ))}
        </div>
      </section>

      {selectedVilla && (
        <VillaModal
          villa={selectedVilla}
          onClose={() => setSelectedVilla(null)}
        />
      )}
    </>
  );
};

export default Villas;
