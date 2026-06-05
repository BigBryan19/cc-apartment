// app/checkout/page.tsx
"use client";

import React, { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  ChevronLeft,
  CreditCard,
  Smartphone,
  ShieldCheck,
  MapPin,
} from "lucide-react";
import { villasData } from "../components/villas/villasData"; // Adjust path if needed
import { VillaProps } from "../components/villas/types"; // Adjust path if needed

const CheckoutPage = () => {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [villa, setVilla] = useState<VillaProps | null>(null);
  const [selectedRate, setSelectedRate] = useState<string>("");
  const [currency, setCurrency] = useState<string>("GHS");
  const [paymentMethod, setPaymentMethod] = useState<"card" | "momo">("card");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    // Grab details from the URL
    const id = searchParams.get("villaId");
    const rate = searchParams.get("rate");
    const curr = searchParams.get("currency");

    if (id) {
      const foundVilla = villasData.find((v) => v.id === parseInt(id));
      if (foundVilla) setVilla(foundVilla);
    }
    if (rate) setSelectedRate(rate);
    if (curr) setCurrency(curr);
  }, [searchParams]);

  const handlePayment = (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    // Simulate payment processing
    setTimeout(() => {
      setLoading(false);
      alert("Payment Successful! Redirecting to confirmation...");
      // router.push('/success'); // We will build this next!
    }, 2000);
  };

  if (!villa) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-stone-50">
        <div className="animate-pulse flex flex-col items-center">
          <div className="w-8 h-8 border-4 border-slate-900 border-t-transparent rounded-full animate-spin mb-4"></div>
          <p className="text-slate-500 text-sm font-medium tracking-widest uppercase">
            Loading Checkout...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-stone-50 py-12 px-4 md:px-12 font-sans">
      <div className="max-w-5xl mx-auto">
        {/* Header */}
        <button
          onClick={() => router.back()}
          className="flex items-center gap-2 text-sm font-bold text-slate-500 hover:text-slate-900 transition mb-8 uppercase tracking-widest"
        >
          <ChevronLeft size={16} /> Back to Villa
        </button>

        <h1 className="text-4xl text-slate-900 mb-8">
          Secure Checkout
        </h1>

        <div className="grid grid-cols-1 md:grid-cols-12 gap-10">
          {/* Left Column: Form & Payment */}
          <div className="md:col-span-7 space-y-8">
            <form
              onSubmit={handlePayment}
              className="bg-white p-8 rounded-2xl shadow-sm border border-slate-100"
            >
              {/* Personal Details */}
              <h2 className="text-xl text-slate-900 mb-4">
                Guest Information
              </h2>
              <div className="grid grid-cols-2 gap-4 mb-8">
                <div className="col-span-2 sm:col-span-1">
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
                    First Name
                  </label>
                  <input
                    required
                    type="text"
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg p-3 text-sm focus:border-slate-900 outline-none transition"
                    placeholder="John"
                  />
                </div>
                <div className="col-span-2 sm:col-span-1">
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
                    Last Name
                  </label>
                  <input
                    required
                    type="text"
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg p-3 text-sm focus:border-slate-900 outline-none transition"
                    placeholder="Doe"
                  />
                </div>
                <div className="col-span-2">
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
                    Email Address
                  </label>
                  <input
                    required
                    type="email"
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg p-3 text-sm focus:border-slate-900 outline-none transition"
                    placeholder="john@example.com"
                  />
                </div>
                <div className="col-span-2">
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
                    Phone Number
                  </label>
                  <input
                    required
                    type="tel"
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg p-3 text-sm focus:border-slate-900 outline-none transition"
                    placeholder="+233 50 000 0000"
                  />
                </div>
              </div>

              {/* Payment Method Toggle */}
              <h2 className="text-xl text-slate-900 mb-4">
                Payment Method
              </h2>
              <div className="grid grid-cols-2 gap-4 mb-6">
                <div
                  onClick={() => setPaymentMethod("card")}
                  className={`border rounded-xl p-4 flex flex-col items-center justify-center gap-2 cursor-pointer transition ${paymentMethod === "card" ? "border-slate-900 bg-slate-50 text-slate-900 shadow-inner" : "border-slate-200 text-slate-500 hover:border-slate-300"}`}
                >
                  <CreditCard size={24} />
                  <span className="text-xs font-bold uppercase tracking-widest">
                    Credit Card
                  </span>
                </div>
                <div
                  onClick={() => setPaymentMethod("momo")}
                  className={`border rounded-xl p-4 flex flex-col items-center justify-center gap-2 cursor-pointer transition ${paymentMethod === "momo" ? "border-slate-900 bg-slate-50 text-slate-900 shadow-inner" : "border-slate-200 text-slate-500 hover:border-slate-300"}`}
                >
                  <Smartphone size={24} />
                  <span className="text-xs font-bold uppercase tracking-widest">
                    Mobile Money
                  </span>
                </div>
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={loading}
                className="w-full bg-slate-900 text-white py-4 rounded-xl font-bold uppercase tracking-widest text-sm hover:bg-slate-800 transition shadow-lg mt-4 flex items-center justify-center gap-2"
              >
                {loading
                  ? "Processing..."
                  : `Pay ${selectedRate.split("(")[1]?.replace(")", "") || ""}`}
              </button>

              <div className="flex items-center justify-center gap-2 mt-4 text-xs text-slate-400 font-medium">
                <ShieldCheck size={14} /> Payments are secure and encrypted
              </div>
            </form>
          </div>

          {/* Right Column: Order Summary */}
          <div className="md:col-span-5">
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 sticky top-24">
              <h2 className="text-xl text-slate-900 mb-6">
                Booking Summary
              </h2>

              <div className="flex gap-4 mb-6 pb-6 border-b border-slate-100">
                <img
                  src={villa.image}
                  alt={villa.title}
                  className="w-24 h-24 object-cover rounded-xl"
                />
                <div>
                  <h3 className="font-bold text-slate-900">{villa.title}</h3>
                  <div className="flex items-center gap-1 text-[10px] font-bold text-blue-500 uppercase tracking-widest mt-1 mb-2">
                    <MapPin size={10} /> {villa.location}
                  </div>
                  <span className="text-xs bg-slate-100 text-slate-600 px-2 py-1 rounded-md font-medium">
                    {villa.bedrooms} Beds • {villa.guests} Guests
                  </span>
                </div>
              </div>

              <div className="space-y-4 mb-6 pb-6 border-b border-slate-100 text-sm">
                <div className="flex justify-between text-slate-600">
                  <span>Selected Rate</span>
                  <span className="font-medium text-slate-900">
                    {selectedRate.split("(")[0]}
                  </span>
                </div>
                <div className="flex justify-between text-slate-600">
                  <span>Currency</span>
                  <span className="font-medium text-slate-900">{currency}</span>
                </div>
              </div>

              <div className="flex justify-between items-center mb-6">
                <span className="font-bold text-slate-900">Total</span>
                <span className="text-2xl text-slate-900">
                  {selectedRate.split("(")[1]?.replace(")", "") ||
                    `${currency} ${villa.price}`}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CheckoutPage;
