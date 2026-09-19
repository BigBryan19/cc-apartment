// app/villas/[id]/VillaClient.tsx
"use client";

import React, { useState, useEffect, use } from "react";
import { useRouter } from "next/navigation";
import {
  ChevronLeft,
  MapPin,
  Check,
  Tag,
  Calendar,
  Heart,
  Gift,
  CarFront,
  Plus,
  Share2,
} from "lucide-react";
import { villasData } from "../../lib/data";
import Navbar from "../../components/Navbar";
import Footer from "../../components/Footer";
import { formatPrice, getAmenityIcon } from "../../components/villas/utils";

const AVAILABLE_PACKAGES = [
  { id: "Honeymoon Setup", icon: Heart, label: "Honeymoon" },
  { id: "Birthday Decoration", icon: Gift, label: "Birthday" },
  { id: "Luxury Car Rental", icon: CarFront, label: "Car Rental" },
];

export default function VillaClient({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  // Unwrap params using React.use()
  const unwrappedParams = use(params);
  const router = useRouter();
  const villaId = parseInt(unwrappedParams.id);
  const villa = villasData.find((v) => v.id === villaId);

  // States
  const [currency, setCurrency] = useState<"GHS" | "USD">("GHS");
  const [selectedRate, setSelectedRate] = useState<string>("");
  const [selectedRateAmount, setSelectedRateAmount] = useState<number>(0);
  const [checkInDate, setCheckInDate] = useState<string>("");
  const [checkOutDate, setCheckOutDate] = useState<string>("");
  const [totalNights, setTotalNights] = useState<number>(0);
  const [selectedPackages, setSelectedPackages] = useState<string[]>([]);

  useEffect(() => {
    if (villa) {
      if (villa.rates && villa.rates.length > 0) {
        setSelectedRate(villa.rates[0].option);
        setSelectedRateAmount(villa.rates[0].amount);
      } else {
        setSelectedRate("Standard Rate");
        setSelectedRateAmount(villa.price);
      }
    }
  }, [villa]);

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

  if (!villa) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        Villa not found
      </div>
    );
  }

  const togglePackage = (pkgId: string) => {
    setSelectedPackages((prev) =>
      prev.includes(pkgId)
        ? prev.filter((id) => id !== pkgId)
        : [...prev, pkgId],
    );
  };

  const computedTotalPrice = totalNights * selectedRateAmount;

  const handleCheckoutBooking = () => {
    const queryParams = new URLSearchParams({
      villaId: villa.id.toString(),
      rate: selectedRate,
      currency: currency,
      checkIn: checkInDate,
      checkOut: checkOutDate,
      nights: totalNights.toString(),
      totalPrice: computedTotalPrice.toString(),
      packages: selectedPackages.join(","),
    });
    router.push(`/checkout?${queryParams.toString()}`);
  };

  return (
    <div className="bg-stone-50 min-h-screen font-sans">
      <div className="bg-slate-900 pb-20">
        <Navbar
          currency={currency}
          toggleCurrency={() => setCurrency(currency === "GHS" ? "USD" : "GHS")}
        />
      </div>

      <div className="max-w-7xl mx-auto px-4 md:px-12 py-8 -mt-20 relative z-10">
        <button
          onClick={() => router.back()}
          className="flex items-center gap-2 text-white/80 hover:text-white transition mb-6 uppercase tracking-widest text-xs font-bold"
        >
          <ChevronLeft size={16} /> Back to Villas
        </button>

        {/* Image Grid */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 h-[50vh] md:h-[60vh] rounded-3xl overflow-hidden shadow-2xl mb-12">
          <div className="md:col-span-2 md:row-span-2 h-full">
            <img
              src={villa.images[0]}
              alt={villa.title}
              className="w-full h-full object-cover hover:scale-105 transition duration-700"
            />
          </div>
          <div className="hidden md:block h-full">
            <img
              src={villa.images[1]}
              alt="Gallery 1"
              className="w-full h-full object-cover hover:scale-105 transition duration-700"
            />
          </div>
          <div className="hidden md:block h-full">
            <img
              src={villa.images[2]}
              alt="Gallery 2"
              className="w-full h-full object-cover hover:scale-105 transition duration-700"
            />
          </div>
          <div className="hidden md:block col-span-2 h-full">
            <img
              src={villa.images[3] || villa.images[0]}
              alt="Gallery 3"
              className="w-full h-full object-cover hover:scale-105 transition duration-700"
            />
          </div>
        </div>

        {/* Content Split */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12">
          {/* Left Side: Details */}
          <div className="lg:col-span-7 space-y-12">
            <div>
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h1 className="text-4xl md:text-5xl font-serif text-slate-900 mb-2">
                    {villa.title}
                  </h1>
                  <p className="flex items-center gap-2 text-blue-600 font-bold uppercase tracking-widest text-xs">
                    <MapPin size={14} /> {villa.location}
                  </p>
                </div>
                <button
                  onClick={() =>
                    navigator.share?.({ url: window.location.href })
                  }
                  className="p-3 bg-white border border-slate-200 rounded-full shadow-sm hover:bg-slate-50 transition"
                >
                  <Share2 size={20} className="text-slate-600" />
                </button>
              </div>
              <div className="flex gap-4 text-sm text-slate-600 font-medium bg-white p-4 rounded-xl border border-slate-100 shadow-sm inline-flex mb-6">
                <span>{villa.guests} Guests</span> •{" "}
                <span>{villa.bedrooms} Bedrooms</span> •{" "}
                <span>{villa.bathrooms} Baths</span>
              </div>
              <p className="text-slate-600 leading-relaxed">
                {villa.description}
              </p>
            </div>

            {/* Amenities */}
            <div>
              <h3 className="text-2xl font-serif text-slate-900 mb-6">
                What this place offers
              </h3>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                {villa.amenities?.map((item, index) => (
                  <div
                    key={index}
                    className="bg-white p-4 rounded-xl border border-slate-100 flex flex-col items-center justify-center gap-3 text-center shadow-sm"
                  >
                    {getAmenityIcon(item)}
                    <span className="text-xs font-bold text-slate-700">
                      {item}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Right Side: Sticky Booking Card */}
          <div className="lg:col-span-5">
            <div className="bg-white p-8 rounded-3xl shadow-xl border border-slate-100 sticky top-24">
              <h3 className="text-2xl font-serif text-slate-900 mb-6">
                Reserve your stay
              </h3>

              {/* Rates Selection */}
              <div className="mb-6 space-y-3">
                <span className="text-xs font-bold uppercase tracking-widest text-slate-500 flex items-center gap-2">
                  <Tag size={14} /> Select a Room Option
                </span>
                {villa.rates?.map((rate, idx) => {
                  const isSelected = selectedRate === rate.option;
                  return (
                    <div
                      key={idx}
                      onClick={() => {
                        setSelectedRate(rate.option);
                        setSelectedRateAmount(rate.amount);
                      }}
                      className={`flex justify-between items-center p-4 rounded-xl cursor-pointer border-2 transition-all ${isSelected ? "border-slate-900 bg-slate-50" : "border-slate-100 hover:border-slate-300"}`}
                    >
                      <span
                        className={`text-sm font-medium ${isSelected ? "text-slate-900" : "text-slate-600"}`}
                      >
                        {rate.option}
                      </span>
                      <div className="flex items-center gap-2">
                        <span className="font-serif text-slate-900 font-bold">
                          {formatPrice(rate.amount, currency)}{" "}
                          <span className="text-xs font-sans text-slate-400 font-normal">
                            /night
                          </span>
                        </span>
                        {isSelected && (
                          <Check size={16} className="text-slate-900" />
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Date Selection */}
              <div className="mb-6 bg-slate-50 p-4 rounded-xl border border-slate-200">
                <div className="grid grid-cols-2 gap-3 mb-2">
                  <div>
                    <label className="block text-[10px] text-gray-400 font-bold uppercase mb-1">
                      Check-In
                    </label>
                    <input
                      type="date"
                      min={new Date().toISOString().split("T")[0]}
                      value={checkInDate}
                      onChange={(e) => setCheckInDate(e.target.value)}
                      className="w-full bg-white border border-gray-200 rounded-lg p-3 text-xs outline-none text-slate-800 focus:border-slate-400 transition"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] text-gray-400 font-bold uppercase mb-1">
                      Check-Out
                    </label>
                    <input
                      type="date"
                      min={
                        checkInDate || new Date().toISOString().split("T")[0]
                      }
                      disabled={!checkInDate}
                      value={checkOutDate}
                      onChange={(e) => setCheckOutDate(e.target.value)}
                      className="w-full bg-white border border-gray-200 rounded-lg p-3 text-xs outline-none text-slate-800 disabled:opacity-50 focus:border-slate-400 transition"
                    />
                  </div>
                </div>
              </div>

              {/* Packages */}
              <div className="mb-8">
                <span className="text-xs font-bold uppercase tracking-widest text-slate-500 mb-3 block">
                  Add Special Packages
                </span>
                <div className="flex flex-wrap gap-2">
                  {AVAILABLE_PACKAGES.map((pkg) => {
                    const isSelected = selectedPackages.includes(pkg.id);
                    return (
                      <button
                        key={pkg.id}
                        onClick={() => togglePackage(pkg.id)}
                        className={`flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium border transition-all ${isSelected ? "bg-slate-900 border-slate-900 text-white" : "bg-white border-slate-200 text-slate-600 hover:border-slate-400"}`}
                      >
                        <pkg.icon
                          size={14}
                          className={
                            isSelected ? "text-white" : "text-blue-500"
                          }
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

              {totalNights > 0 && (
                <div className="mb-6 flex justify-between items-end pb-6 border-b border-slate-100">
                  <div>
                    <span className="block text-xs uppercase font-bold text-slate-400">
                      Est. Total
                    </span>
                    <span className="text-xs text-slate-600">
                      {formatPrice(selectedRateAmount, currency)} ×{" "}
                      {totalNights} nights
                    </span>
                  </div>
                  <span className="text-3xl font-serif text-slate-900">
                    {formatPrice(computedTotalPrice, currency)}
                  </span>
                </div>
              )}

              <button
                onClick={handleCheckoutBooking}
                disabled={!checkInDate || !checkOutDate || totalNights === 0}
                className="w-full bg-slate-900 text-white py-4 font-bold uppercase tracking-widest text-xs hover:bg-slate-800 transition rounded-xl shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {!checkInDate || !checkOutDate
                  ? "Select Dates to Book"
                  : "Proceed to Checkout"}
              </button>
            </div>
          </div>
        </div>
      </div>
      <Footer />
    </div>
  );
}
