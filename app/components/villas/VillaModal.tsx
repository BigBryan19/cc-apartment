// components/villas/VillaModal.tsx
"use client";

import React, { useState, useEffect } from "react";
import { X, Share2, ChevronLeft, ChevronRight, Check, Tag } from "lucide-react";
import { VillaProps } from "./types";
import { formatPrice, getAmenityIcon } from "./utils";
import { useRouter } from "next/navigation";

interface VillaModalProps {
  villa: VillaProps;
  onClose: () => void;
  currency: "GHS" | "USD";
}


const VillaModal: React.FC<VillaModalProps> = ({
  villa,
  onClose,
  currency,
}) => {
  const [selectedRate, setSelectedRate] = useState<string | null>(null);
  const [currentSlide, setCurrentSlide] = useState(0);

  // NEW: State to toggle booking options
  const [showBookingOptions, setShowBookingOptions] = useState(false);

    
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

  // --- NEW: Updated Booking Handlers ---
  const handleWhatsAppBooking = () => {
    const phoneNumber = "233534770274";
    const imageUrl = villa.image.startsWith("http")
      ? villa.image
      : `${window.location.origin}${villa.image}`;
    const message = `*Booking Request*\n\nI am interested in: *${villa.title}*\nCurrency: ${currency}\nSelected Rate: ${selectedRate || "Default"}\n\nView Property: ${imageUrl}`;
    const whatsappUrl = `https://wa.me/${phoneNumber}?text=${encodeURIComponent(message)}`;
    window.open(whatsappUrl, "_blank");
  };

  const handleCheckoutBooking = () => {
    // We pass the villa ID and the selected rate in the URL
    const queryParams = new URLSearchParams({
      villaId: villa.id.toString(),
      rate: selectedRate || "Default",
      currency: currency,
    });

    router.push(`/checkout?${queryParams.toString()}`);
  };;

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
          <div className="absolute bottom-4 flex gap-2">
            {slides.map((_, idx) => (
              <div
                key={idx}
                className={`w-2 h-2 rounded-full transition-all ${idx === currentSlide ? "bg-white w-4" : "bg-white/40"}`}
              />
            ))}
          </div>
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

          {/* --- NEW: The Toggling Booking Section --- */}
          <div className="mt-auto pt-4">
            {!showBookingOptions ? (
              <button
                onClick={() => setShowBookingOptions(true)}
                className="w-full bg-slate-900 text-white py-4 font-bold uppercase tracking-widest text-xs hover:bg-slate-800 transition rounded-lg flex items-center justify-center gap-2 shadow-lg hover:shadow-xl"
              >
                Book Now
              </button>
            ) : (
              <div className="flex flex-col gap-3 animate-in fade-in slide-in-from-bottom-2 duration-300 bg-slate-50 p-4 rounded-xl border border-slate-200 shadow-inner">
                <span className="text-center text-xs font-bold uppercase tracking-widest text-slate-500 mb-2">
                  Choose Booking Method
                </span>

                <button
                  onClick={handleCheckoutBooking}
                  className="w-full bg-slate-500 text-white py-3 font-bold uppercase tracking-widest text-xs hover:bg-blue-700 transition rounded-lg shadow-md"
                >
                  Proceed to Checkout
                </button>

                <button
                  onClick={handleWhatsAppBooking}
                  className="w-full bg-transparent border border-slate-500 text-slate-500 py-3 font-bold uppercase tracking-widest text-xs hover:bg-green-600 transition rounded-lg shadow-md"
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
