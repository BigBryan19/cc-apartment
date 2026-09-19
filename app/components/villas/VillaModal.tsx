"use client";

import React, { useState, useEffect } from "react";
import {
  X,
  Share2,
  ChevronLeft,
  ChevronRight,
  Check,
  Tag,
  Calendar,
  Heart,
  Gift,
  CarFront,
  Plus,
} from "lucide-react";
import { VillaProps } from "./types";
import { formatPrice, getAmenityIcon } from "./utils";
import { useRouter } from "next/navigation";

interface VillaModalProps {
  villa: VillaProps;
  onClose: () => void;
  currency: "GHS" | "USD";
}

// Define the available packages
const AVAILABLE_PACKAGES = [
  { id: "Honeymoon Setup", icon: Heart, label: "Honeymoon" },
  { id: "Birthday Decoration", icon: Gift, label: "Birthday" },
  { id: "Luxury Car Rental", icon: CarFront, label: "Car Rental" },
];

const VillaModal: React.FC<VillaModalProps> = ({
  villa,
  onClose,
  currency,
}) => {
  const [selectedRate, setSelectedRate] = useState<string | null>(null);
  const [selectedRateAmount, setSelectedRateAmount] = useState<number>(
    villa.price,
  );
  const [currentSlide, setCurrentSlide] = useState(0);
  const [showBookingOptions, setShowBookingOptions] = useState(false);

  // Custom Day Selection States
  const [checkInDate, setCheckInDate] = useState<string>("");
  const [checkOutDate, setCheckOutDate] = useState<string>("");
  const [totalNights, setTotalNights] = useState<number>(0);

  // --- NEW: State for selected packages ---
  const [selectedPackages, setSelectedPackages] = useState<string[]>([]);

  const router = useRouter();

  const slides = villa.video
    ? [
        { type: "video", src: villa.video },
        ...villa.images.map((img) => ({ type: "image", src: img })),
      ]
    : villa.images.map((img) => ({ type: "image", src: img }));

  useEffect(() => {
    document.body.style.overflow = "hidden";
    if (villa.rates && villa.rates.length > 0) {
      setSelectedRate(villa.rates[0].option);
      setSelectedRateAmount(villa.rates[0].amount);
    } else {
      setSelectedRate("Standard Rate");
      setSelectedRateAmount(villa.price);
    }
    return () => {
      document.body.style.overflow = "unset";
    };
  }, [villa, currency]);

  useEffect(() => {
    if (checkInDate && checkOutDate) {
      const start = new Date(checkInDate);
      const end = new Date(checkOutDate);
      const timeDiff = end.getTime() - start.getTime();
      const calculatedNights = Math.ceil(timeDiff / (1000 * 3600 * 24));

      setTotalNights(calculatedNights > 0 ? calculatedNights : 0);
    } else {
      setTotalNights(0);
    }
  }, [checkInDate, checkOutDate]);

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

  const getTodayDateString = () => {
    const today = new Date();
    return today.toISOString().split("T")[0];
  };

  const pricePerNight = selectedRateAmount;
  const computedTotalPrice = totalNights * pricePerNight;

  // --- NEW: Toggle Package Selection ---
  const togglePackage = (pkgId: string) => {
    setSelectedPackages((prev) =>
      prev.includes(pkgId)
        ? prev.filter((id) => id !== pkgId)
        : [...prev, pkgId],
    );
  };

  // --- UPDATED: Passing selected packages to WhatsApp ---
  const handleWhatsAppBooking = () => {
    const phoneNumber = "2330540534870";
    const imageUrl = villa.image.startsWith("http")
      ? villa.image
      : `${window.location.origin}${villa.image}`;

    const datesDetails =
      totalNights > 0
        ? `\n*Check-in:* ${checkInDate}\n*Check-out:* ${checkOutDate}\n*Duration:* ${totalNights} Night(s)\n*Estimated Room Bill:* ${formatPrice(computedTotalPrice, currency)}`
        : `\n*Dates Selected:* Not Specified`;

    const packagesDetails =
      selectedPackages.length > 0
        ? `\n\n*Requested Add-ons:*\n- ${selectedPackages.join("\n- ")}`
        : "";

    const message = `*Booking Request*\n\nI am interested in: *${villa.title}*\n*Location:* ${villa.location}\n*Currency:* ${currency}\n*Selected Option:* ${selectedRate || "Default"}${datesDetails}${packagesDetails}\n\nView Property: ${imageUrl}`;
    const whatsappUrl = `https://wa.me/${phoneNumber}?text=${encodeURIComponent(message)}`;
    window.open(whatsappUrl, "_blank");
  };

  const handleCheckoutBooking = () => {
    const queryParams = new URLSearchParams({
      villaId: villa.id.toString(),
      rate: selectedRate || "Default",
      currency: currency,
      checkIn: checkInDate,
      checkOut: checkOutDate,
      nights: totalNights.toString(),
      totalPrice: computedTotalPrice.toString(),
      packages: selectedPackages.join(","), // Pass packages in URL
    });

    router.push(`/checkout?${queryParams.toString()}`);
  };

  if (!villa) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-slate-900/80 backdrop-blur-sm transition-opacity"
        onClick={onClose}
      />
      <div className="relative bg-white rounded-2xl overflow-hidden shadow-2xl w-full max-w-5xl max-h-[90vh] flex flex-col md:flex-row animate-in fade-in zoom-in duration-300">
        {/* Top Action Buttons */}
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

        {/* Media Slider Section */}
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
        </div>

        {/* Details Section */}
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
                    const isSelected = selectedRate === rate.option;
                    return (
                      <div
                        key={idx}
                        onClick={() => {
                          setSelectedRate(rate.option);
                          setSelectedRateAmount(rate.amount);
                        }}
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

          <p className="text-gray-600 leading-relaxed text-sm mb-6">
            {villa.description}
          </p>

          {/* Broad Day Range Picker Interface */}
          <div className="mb-6 bg-slate-50 p-4 rounded-xl border border-slate-200">
            <div className="flex items-center gap-2 mb-3 text-slate-700">
              <Calendar size={16} />
              <span className="text-xs font-bold uppercase tracking-widest">
                Select Rental Days
              </span>
            </div>
            <div className="grid grid-cols-2 gap-3 mb-2">
              <div>
                <label className="block text-[10px] text-gray-400 font-bold uppercase mb-1">
                  Check-In
                </label>
                <input
                  type="date"
                  min={getTodayDateString()}
                  value={checkInDate}
                  onChange={(e) => {
                    setCheckInDate(e.target.value);
                    if (checkOutDate && e.target.value >= checkOutDate) {
                      setCheckOutDate("");
                    }
                  }}
                  className="w-full bg-white border border-gray-200 rounded-lg p-2 text-xs outline-none text-slate-800 focus:border-slate-400 transition"
                />
              </div>
              <div>
                <label className="block text-[10px] text-gray-400 font-bold uppercase mb-1">
                  Check-Out
                </label>
                <input
                  type="date"
                  min={checkInDate || getTodayDateString()}
                  disabled={!checkInDate}
                  value={checkOutDate}
                  onChange={(e) => setCheckOutDate(e.target.value)}
                  className="w-full bg-white border border-gray-200 rounded-lg p-2 text-xs outline-none text-slate-800 disabled:opacity-50 focus:border-slate-400 transition"
                />
              </div>
            </div>
          </div>

          {/* --- NEW: Special Packages Selector --- */}
          <div className="mb-8">
            <span className="text-xs font-bold uppercase tracking-widest text-slate-500 mb-3 block">
              Enhance Your Stay
            </span>
            <div className="flex flex-wrap gap-2">
              {AVAILABLE_PACKAGES.map((pkg) => {
                const isSelected = selectedPackages.includes(pkg.id);
                return (
                  <button
                    key={pkg.id}
                    onClick={() => togglePackage(pkg.id)}
                    className={`flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium border transition-all duration-300 ${
                      isSelected
                        ? "bg-slate-900 border-slate-900 text-white shadow-md"
                        : "bg-white border-slate-200 text-slate-600 hover:border-slate-400"
                    }`}
                  >
                    <pkg.icon
                      size={14}
                      className={isSelected ? "text-white" : "text-blue-500"}
                    />
                    {pkg.label}
                    {isSelected ? (
                      <Check size={12} className="ml-1 opacity-70" />
                    ) : (
                      <Plus size={12} className="ml-1 opacity-50" />
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Pricing summary card injected when calendar data exists */}
          {totalNights > 0 && (
            <div className="mb-4 bg-blue-50/50 border border-blue-100 p-4 rounded-xl flex justify-between items-center animate-in fade-in duration-300">
              <div>
                <span className="block text-[10px] uppercase font-bold text-slate-400">
                  Estimated Pricing
                </span>
                <span className="text-xs text-slate-600">
                  {formatPrice(pricePerNight, currency)} × {totalNights} nights
                </span>
              </div>
              <div className="text-right flex flex-col items-end">
                <span className="text-xl font-serif font-black text-slate-900">
                  {formatPrice(computedTotalPrice, currency)}
                </span>
                {selectedPackages.length > 0 && (
                  <span className="text-[10px] text-blue-600 font-medium">
                    + Add-ons quote pending
                  </span>
                )}
              </div>
            </div>
          )}

          {/* Booking Button Trigger Panel */}
          <div className="mt-auto pt-4">
            {!showBookingOptions ? (
              <button
                onClick={() => setShowBookingOptions(true)}
                disabled={!checkInDate || !checkOutDate || totalNights === 0}
                className="w-full bg-slate-900 text-white py-4 font-bold uppercase tracking-widest text-xs hover:bg-slate-800 transition rounded-lg flex items-center justify-center gap-2 shadow-lg hover:shadow-xl disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {!checkInDate || !checkOutDate
                  ? "Select Dates to Book"
                  : "Proceed to Book"}
              </button>
            ) : (
              <div className="flex flex-col gap-3 animate-in fade-in slide-in-from-bottom-2 duration-300 bg-slate-50 p-4 rounded-xl border border-slate-200 shadow-inner">
                <span className="text-center text-xs font-bold uppercase tracking-widest text-slate-500 mb-2">
                  Choose Booking Method
                </span>
                <button
                  onClick={handleCheckoutBooking}
                  className="w-full bg-slate-700 text-white py-3 font-bold uppercase tracking-widest text-xs hover:bg-slate-800 transition rounded-lg shadow-md"
                >
                  Proceed to Checkout
                </button>
                <button
                  onClick={handleWhatsAppBooking}
                  className="w-full bg-transparent border border-slate-500 text-slate-700 py-3 font-bold uppercase tracking-widest text-xs hover:bg-slate-200 transition rounded-lg shadow-md"
                >
                  Book via WhatsApp
                </button>
                <button
                  onClick={() => setShowBookingOptions(false)}
                  className="mt-2 text-xs text-slate-500 hover:text-slate-800 font-medium transition"
                >
                  Cancel
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default VillaModal;
