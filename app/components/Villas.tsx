"use client";

import React, { useState, useEffect, useMemo } from "react";
import {
  Heart,
  Users,
  BedDouble,
  Bath,
  X,
  Play,
  MapPin,
  Wifi,
  Utensils,
  Waves,
  Sofa,
  Tv,
  CheckCircle,
  Tag,
  Check,
  Share2,
  ChevronLeft,
  ChevronRight,
  Image as ImageIcon,
  LayoutGrid, // Icon for Grid View
  Map, // Icon for Map View
} from "lucide-react";
// Import filter type
import { SearchFilters } from "../page";

// --- Configuration ---
const EXCHANGE_RATE = 15; // 1 USD = 15 GHS

// --- Types ---
interface VillaProps {
  id: number;
  image: string;
  images: string[];
  video?: string;
  price: number; // Base price in GHS
  title: string;
  location: string;
  // NEW: Added lat/lng for the map view
  coordinates: { lat: number; lng: number };
  guests: number;
  bedrooms: number;
  hasPool: boolean;
  bathrooms: number;
  description: string;
  amenities?: string[];
  rates?: { option: string; amount: number }[];
  monthlyRate?: { option: string; amount: number }[];
}

// --- Helpers ---
const getAmenityIcon = (text: string) => {
  // ... (same as before)
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

const formatPrice = (amount: number, currency: "GHS" | "USD") => {
  // ... (same as before)
  if (currency === "GHS") {
    return `₵${amount.toLocaleString()}`;
  } else {
    const usdAmount = Math.round(amount / EXCHANGE_RATE);
    return `$${usdAmount.toLocaleString()}`;
  }
};

// --- Component: Villa Card (Unchanged) ---
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
}) => (
  // ... (Keep your exact VillaCard component code here. Omitted for brevity as it hasn't changed)
  <div
    onClick={() => onClick(villa)}
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
          <Bath size={14} className="text-slate-400" /> {villa.bathrooms} baths
        </div>
      </div>
    </div>
  </div>
);

// --- Component: Villa Modal (Unchanged) ---
const VillaModal = ({
  villa,
  onClose,
  currency,
}: {
  villa: VillaProps;
  onClose: () => void;
  currency: "GHS" | "USD";
}) => {
  // ... (Keep your exact VillaModal component code here. Omitted for brevity)
  // --- Copy past from previous response ---
  const [selectedRate, setSelectedRate] = useState<string | null>(null);
  const [currentSlide, setCurrentSlide] = useState(0);

  const slides = villa.video
    ? [
        { type: "video", src: villa.video },
        ...villa.images.map((img) => ({ type: "image", src: img })),
      ]
    : villa.images.map((img) => ({ type: "image", src: img }));

  useEffect(() => {
    document.body.style.overflow = "hidden";
    if (villa.rates && villa.rates.length > 0) {
      setSelectedRate(
        `${villa.rates[0].option} (${formatPrice(villa.rates[0].amount, currency)})`,
      );
    }
    return () => {
      document.body.style.overflow = "unset";
    };
  }, [villa, currency]);

  const handleNext = () =>
    setCurrentSlide((prev) => (prev === slides.length - 1 ? 0 : prev + 1));
  const handlePrev = () =>
    setCurrentSlide((prev) => (prev === 0 ? slides.length - 1 : prev - 1));

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: `Check out ${villa.title}`,
          text: `Found this villa in ${villa.location} for ${formatPrice(villa.price, currency)}/night!`,
          url: window.location.href,
        });
      } catch (error) {
        console.log("Error sharing", error);
      }
    } else {
      alert("Link copied to clipboard!");
    }
  };

  const handleBookNow = () => {
    const phoneNumber = "233534770274";
    const imageUrl = villa.image.startsWith("http")
      ? villa.image
      : `${window.location.origin}${villa.image}`;
    const message = `*Booking Request*\n\nI am interested in: *${villa.title}*\nCurrency: ${currency}\nSelected Rate: ${selectedRate || "Default"}\n\nView Property: ${imageUrl}`;
    const whatsappUrl = `https://wa.me/${phoneNumber}?text=${encodeURIComponent(message)}`;
    window.open(whatsappUrl, "_blank");
  };

  if (!villa) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-slate-900/80 backdrop-blur-sm transition-opacity"
        onClick={onClose}
      />
      <div className="relative bg-white rounded-2xl overflow-hidden shadow-2xl w-full max-w-5xl max-h-[90vh] flex flex-col md:flex-row animate-in fade-in zoom-in duration-300">
        <div className="absolute top-4 right-4 z-50 flex gap-3">
          <button
            onClick={handleShare}
            className="p-2 bg-white/20 hover:bg-white/40 text-white rounded-full backdrop-blur-md transition border border-white/20"
          >
            <Share2 size={20} />
          </button>
          <button
            onClick={onClose}
            className="p-2 bg-black/50 hover:bg-black/70 text-white rounded-full backdrop-blur-md transition"
          >
            <X size={20} />
          </button>
        </div>

        <div className="w-full md:w-2/3 bg-black flex items-center justify-center shrink-0 h-72 md:h-auto relative group">
          {slides[currentSlide].type === "video" ? (
            <video
              src={slides[currentSlide].src}
              controls
              autoPlay
              className="w-full h-full object-contain"
            />
          ) : (
            <img
              src={slides[currentSlide].src}
              alt={villa.title}
              className="w-full h-full object-cover"
            />
          )}
          {slides.length > 1 && (
            <>
              <button
                onClick={handlePrev}
                className="absolute left-4 p-2 rounded-full bg-white/10 hover:bg-white/30 text-white backdrop-blur-sm border border-white/20 transition opacity-0 group-hover:opacity-100"
              >
                <ChevronLeft size={24} />
              </button>
              <button
                onClick={handleNext}
                className="absolute right-4 p-2 rounded-full bg-white/10 hover:bg-white/30 text-white backdrop-blur-sm border border-white/20 transition opacity-0 group-hover:opacity-100"
              >
                <ChevronRight size={24} />
              </button>
            </>
          )}
          <div className="absolute bottom-4 flex gap-2">
            {slides.map((_, idx) => (
              <div
                key={idx}
                className={`w-2 h-2 rounded-full transition-all ${idx === currentSlide ? "bg-white w-4" : "bg-white/40"}`}
              />
            ))}
          </div>
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
                    Select a Rate
                  </span>
                </div>
                <div className="space-y-2">
                  {villa.rates.map((rate, idx) => {
                    const rateString = `${rate.option} (${formatPrice(rate.amount, currency)})`;
                    const isSelected = selectedRate === rateString;
                    return (
                      <div
                        key={idx}
                        onClick={() => setSelectedRate(rateString)}
                        className={`flex justify-between items-center text-sm p-3 rounded-lg cursor-pointer border transition-all ${isSelected ? "bg-white border-blue-500 shadow-sm" : "border-transparent hover:bg-slate-200"}`}
                      >
                        <span
                          className={`font-medium ${isSelected ? "text-blue-600" : "text-slate-600"}`}
                        >
                          {rate.option}
                        </span>
                        <div className="flex items-center gap-2">
                          <span className="font-serif text-slate-900 font-bold">
                            {formatPrice(rate.amount, currency)}
                          </span>
                          {isSelected && (
                            <Check size={14} className="text-blue-600" />
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ) : (
              <div className="text-xl font-medium text-slate-700 mt-2">
                {formatPrice(villa.price, currency)}{" "}
                <span className="text-sm text-gray-400 font-normal">
                  / night
                </span>
              </div>
            )}
          </div>
          <p className="text-gray-600 leading-relaxed text-sm mb-8">
            {villa.description}
          </p>
          <div className="grid grid-cols-2 gap-4 mb-8">
            {villa.amenities?.map((item, index) => (
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
          <div className="mt-auto pt-4">
            <button
              onClick={handleBookNow}
              className="w-full bg-slate-900 text-white py-4 font-bold uppercase tracking-widest text-xs hover:bg-slate-800 transition rounded-lg flex items-center justify-center gap-2"
            >
              Book via WhatsApp
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

// --- NEW COMPONENT: Map View Placeholder ---
const VillaMapView = ({
  villas,
  onMarkerClick,
}: {
  villas: VillaProps[];
  onMarkerClick: (v: VillaProps) => void;
}) => {
  // This is a visual placeholder. In a real app, you'd use react-google-maps or leaflet.
  return (
    <div className="w-full h-[600px] bg-slate-100 rounded-2xl relative overflow-hidden group cursor-grab active:cursor-grabbing">
      {/* Placeholder Map Image (replace with a real map screenshot of Ghana) */}
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
          // Rough positioning based on mock lat/lng for demo purposes
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

// --- Main Component ---
const Villas: React.FC<{
  currency: "GHS" | "USD";
  searchFilters: SearchFilters;
}> = ({ currency, searchFilters }) => {
  const [selectedVilla, setSelectedVilla] = useState<VillaProps | null>(null);
  const [favorites, setFavorites] = useState<number[]>([]);
  // NEW: View Mode State
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

  const villasData: VillaProps[] = [
    {
      id: 1,
      title: "Lakeside Estate",
      location: "Greater Accra • Lakeside",
      coordinates: { lat: 5.683, lng: -0.136 },
      price: 2000,
      guests: 4,
      bedrooms: 3,
      hasPool: true,
      bathrooms: 5,
      image: "/lake1.jpg",
      images: ["/lake1.jpg", "/lake2.jpg", "/lake3.jpg", "/lake4.jpg"],
      video: "/lakeside.mp4",
      description:
        "Experience comfort, privacy, and elegance in this beautifully furnished apartment located in the serene and secure Lakeside Estate.",
      amenities: [
        "Free Wi-Fi",
        "Kitchen",
        "Pool",
        "Well-furnished hall",
        "Television in all rooms",
        "PS5 Gaming Console",
      ],
      rates: [
        { option: "One bedrooms", amount: 1500 },
        { option: "Two bedrooms", amount: 2000 },
        { option: "Monthly Rate (Whole apartment)", amount: 30000 },
        { option: "Whole apartment (4 bedrooms)", amount: 36000 },
      ],
    },
    {
      id: 2,
      title: "Aburi Mountain Retreat",
      location: "Eastern Region • Aburi",
      coordinates: { lat: 5.845, lng: -0.177 }, // Mock coordinates for Aburi
      price: 600,
      guests: 4,
      bedrooms: 4,
      hasPool: true,
      bathrooms: 5,
      image: "Aburi1.jpeg",
      images: ["Aburi1.jpeg", "Aburi2.jpeg", "Aburi3.jpeg", "Aburi4.jpeg"],
      video: "/aburi.mp4",
      description:
        "Nestled in the serene and refreshing environment of Aburi, this beautifully furnished apartment offers comfort.",
      amenities: [
        "Free Wi-Fi",
        "Kitchen",
        "Pool",
        "Well-furnished hall",
        "Television in all rooms",
        "PS5 Gaming Console",
      ],
      monthlyRate: [{ option: "Whole apartment", amount: 30000 }],
      rates: [
        { option: "Single bedroom", amount: 600 },
        { option: "Studio", amount: 800 },
        { option: "One bedrooms", amount: 1200 },
        { option: "Two bedrooms", amount: 2000 },
        { option: "Whole apartment (4 bedrooms)", amount: 3500 },
        { option: "Monthly Rate (Whole apartment)", amount: 30000 },
      ],
    },

    {
      id: 3,
      title: "Adenta Serenity",
      location: "Greater Accra • Adenta",
      coordinates: { lat: 5.845, lng: -0.177 },
      price: 600,
      guests: 4,
      bedrooms: 4,
      hasPool: true,
      bathrooms: 5,
      image: "Adenta1.jpg",
      images: ["Adenta1.jpg", "Adenta2.jpg", "Adenta3.jpg", "Adenta4.jpg"],
      // video: "/adenta.mp4",
      description:
        "Located in the heart of Adenta, this premium apartment combines luxury, comfort, and entertainment with modern furnishings, a grand piano, and a PS5 gaming console.",
      amenities: [
        "Free Wi-Fi",
        "Kitchen",
        "Pool",
        "Well-furnished hall",
        "Television in all rooms",
        "Grand Piano",
        "PS5 Gaming Console",
      ],
      rates: [
        { option: "Single bedroom", amount: 600 },
        { option: "Studio", amount: 800 },
        { option: "Two bedrooms", amount: 2000 },
        { option: "Monthly Rate (Whole apartment)", amount: 30000 },
        { option: "Whole apartment (4 bedrooms)", amount: 42000 },
      ],
    },
  ];

  // --- NEW: Filtering Logic ---
  const filteredVillas = useMemo(() => {
    return villasData.filter((villa) => {
      // 1. Filter by Location (if selected)
      const locationMatch = searchFilters.location
        ? villa.location
            .toLowerCase()
            .includes(searchFilters.location.toLowerCase())
        : true;

      // 2. Filter by Guests
      const guestsMatch = villa.guests >= searchFilters.guests;

      // 3. Filter by Price (This is tricky due to currency!)
      let villaPriceInSelectedCurrency = villa.price;
      if (currency === "USD") {
        villaPriceInSelectedCurrency = Math.round(villa.price / EXCHANGE_RATE);
      }
      // Compare price in current currency vs slider value in current currency
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

          {/* --- INNOVATION 3: Map/Grid View Toggle Buttons --- */}
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

        {/* Conditional Rendering based on View Mode */}
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
