// app/checkout/page.tsx
"use client";
import React, { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  ChevronLeft,
  CreditCard,
  Smartphone,
  ShieldCheck,
  MapPin,
  Loader2,
  Calendar,
  Gift,
} from "lucide-react";
import { createClient } from "../utils/supabase";
import { VillaProps } from "../components/villas/types";

const CheckoutContent = () => {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [villa, setVilla] = useState<VillaProps | null>(null);
  const [selectedRate, setSelectedRate] = useState<string>("");
  const [currency, setCurrency] = useState<string>("GHS");
  const [paymentMethod, setPaymentMethod] = useState<"card" | "mobile_money">(
    "card",
  );
  const [loading, setLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  // --- NEW: States for the new URL parameters ---
  const [checkOutDate, setCheckOutDate] = useState<string>("");
  const [totalNights, setTotalNights] = useState<number>(0);
  const [computedTotal, setComputedTotal] = useState<number>(0);
  const [selectedPackages, setSelectedPackages] = useState<string[]>([]);

  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    checkInDate: "",
  });

  const supabase = createClient();

  useEffect(() => {
    const id = searchParams.get("villaId");
    const rate = searchParams.get("rate");
    const curr = searchParams.get("currency");

    // --- NEW: Extracting extra parameters ---
    const checkInParam = searchParams.get("checkIn");
    const checkOutParam = searchParams.get("checkOut");
    const nightsParam = searchParams.get("nights");
    const totalParam = searchParams.get("totalPrice");
    const packagesParam = searchParams.get("packages");

    const fetchVilla = async () => {
      if (id) {
        const { data, error } = await supabase
          .from("villas")
          .select("*")
          .eq("id", id)
          .single();

        if (data && !error) {
          setVilla({ ...data, hasPool: data.has_pool });
        }
      }
    };
    fetchVilla();

    if (rate) setSelectedRate(rate);
    if (curr) setCurrency(curr);
    if (checkOutParam) setCheckOutDate(checkOutParam);
    if (nightsParam) setTotalNights(parseInt(nightsParam));
    if (totalParam) setComputedTotal(parseFloat(totalParam));
    if (packagesParam)
      setSelectedPackages(packagesParam.split(",").filter(Boolean));

    // Pre-fill the check-in date if it exists
    if (checkInParam) {
      setFormData((prev) => ({ ...prev, checkInDate: checkInParam }));
    }
  }, [searchParams]);

  // --- LIVE DATABASE SUBMISSION ---
  const handlePaymentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.email || !formData.checkInDate || !villa) {
      return alert(
        "Please fill out all required fields, including your check-in date.",
      );
    }

    setLoading(true);

    // Use the exact computed total from the URL if available, otherwise fallback
    const finalAmount = computedTotal > 0 ? computedTotal : villa.price;

    // Insert the booking into Supabase
    // Note: If you want to save packages and check-out dates to the DB,
    // you will need to add those columns to your Supabase 'bookings' table first!
    const { error } = await supabase.from("bookings").insert([
      {
        villa_id: villa.id,
        guest_name: `${formData.firstName} ${formData.lastName}`.trim(),
        guest_email: formData.email,
        guest_phone: formData.phone,
        check_in_date: formData.checkInDate,
        total_amount: finalAmount,
        payment_method: paymentMethod,
        status: "pending",
      },
    ]);

    setLoading(false);

    if (error) {
      alert("Something went wrong processing your booking: " + error.message);
    } else {
      setIsSuccess(true);
      setTimeout(() => {
        router.push("/");
      }, 3000);
    }
  };

  if (isSuccess) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-stone-50">
        <div className="bg-white p-12 rounded-3xl shadow-lg text-center max-w-md animate-in zoom-in duration-500">
          <div className="w-20 h-20 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto mb-6">
            <ShieldCheck size={40} />
          </div>
          <h2 className="text-3xl font-serif text-slate-900 mb-4">
            Booking Received!
          </h2>
          <p className="text-slate-500 mb-8 leading-relaxed">
            Thank you, {formData.firstName}. We have received your reservation
            request. Our team will contact you shortly to confirm.
          </p>
          <div className="animate-pulse text-xs font-bold text-slate-400 uppercase tracking-widest">
            Redirecting to home...
          </div>
        </div>
      </div>
    );
  }

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
        <button
          onClick={() => router.back()}
          className="flex items-center gap-2 text-sm font-bold text-slate-500 hover:text-slate-900 transition mb-8 uppercase tracking-widest"
        >
          <ChevronLeft size={16} /> Back to Villa
        </button>

        <h1 className="text-4xl font-serif text-slate-900 mb-8">
          Secure Checkout
        </h1>

        <div className="grid grid-cols-1 md:grid-cols-12 gap-10">
          <div className="md:col-span-7 space-y-8">
            <form
              onSubmit={handlePaymentSubmit}
              className="bg-white p-8 rounded-2xl shadow-sm border border-slate-100"
            >
              <h2 className="text-xl font-serif text-slate-900 mb-4">
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
                    value={formData.firstName}
                    onChange={(e) =>
                      setFormData({ ...formData, firstName: e.target.value })
                    }
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
                    value={formData.lastName}
                    onChange={(e) =>
                      setFormData({ ...formData, lastName: e.target.value })
                    }
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
                    value={formData.email}
                    onChange={(e) =>
                      setFormData({ ...formData, email: e.target.value })
                    }
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg p-3 text-sm focus:border-slate-900 outline-none transition"
                    placeholder="john@example.com"
                  />
                </div>
                <div className="col-span-2 sm:col-span-1">
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
                    Phone Number
                  </label>
                  <input
                    required
                    type="tel"
                    value={formData.phone}
                    onChange={(e) =>
                      setFormData({ ...formData, phone: e.target.value })
                    }
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg p-3 text-sm focus:border-slate-900 outline-none transition"
                    placeholder="+233 50 000 0000"
                  />
                </div>
                <div className="col-span-2 sm:col-span-1">
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 flex items-center gap-1">
                    <Calendar size={14} /> Check-in Date
                  </label>
                  <input
                    required
                    type="date"
                    value={formData.checkInDate}
                    onChange={(e) =>
                      setFormData({ ...formData, checkInDate: e.target.value })
                    }
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg p-3 text-sm focus:border-slate-900 outline-none transition"
                  />
                </div>
              </div>

              <h2 className="text-xl font-serif text-slate-900 mb-4">
                Payment Method
              </h2>
              <div className="grid grid-cols-2 gap-4 mb-6">
                <div
                  onClick={() => setPaymentMethod("card")}
                  className={`border rounded-xl p-4 flex flex-col items-center justify-center gap-2 cursor-pointer transition ${
                    paymentMethod === "card"
                      ? "border-slate-900 bg-slate-50 text-slate-900 shadow-inner"
                      : "border-slate-200 text-slate-500 hover:border-slate-300"
                  }`}
                >
                  <CreditCard size={24} />
                  <span className="text-xs font-bold uppercase tracking-widest">
                    Credit Card
                  </span>
                </div>
                <div
                  onClick={() => setPaymentMethod("mobile_money")}
                  className={`border rounded-xl p-4 flex flex-col items-center justify-center gap-2 cursor-pointer transition ${
                    paymentMethod === "mobile_money"
                      ? "border-slate-900 bg-slate-50 text-slate-900 shadow-inner"
                      : "border-slate-200 text-slate-500 hover:border-slate-300"
                  }`}
                >
                  <Smartphone size={24} />
                  <span className="text-xs font-bold uppercase tracking-widest">
                    Mobile Money
                  </span>
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-slate-900 text-white py-4 rounded-xl font-bold uppercase tracking-widest text-sm hover:bg-slate-800 transition shadow-lg mt-4 flex items-center justify-center gap-2"
              >
                {loading ? (
                  <>
                    <Loader2 size={16} className="animate-spin" /> Processing...
                  </>
                ) : (
                  `Pay ${currency} ${computedTotal > 0 ? computedTotal.toLocaleString() : villa.price.toLocaleString()}`
                )}
              </button>
              <div className="flex items-center justify-center gap-2 mt-4 text-xs text-slate-400 font-medium">
                <ShieldCheck size={14} /> Payments are secure and encrypted
              </div>
            </form>
          </div>

          <div className="md:col-span-5">
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 sticky top-24">
              <h2 className="text-xl font-serif text-slate-900 mb-6">
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
                    {selectedRate || "Standard"}
                  </span>
                </div>

                {/* --- NEW: Display the extracted Dates and Nights --- */}
                {totalNights > 0 && (
                  <>
                    <div className="flex justify-between text-slate-600">
                      <span>Check-out</span>
                      <span className="font-medium text-slate-900">
                        {checkOutDate}
                      </span>
                    </div>
                    <div className="flex justify-between text-slate-600">
                      <span>Duration</span>
                      <span className="font-medium text-slate-900">
                        {totalNights} Night(s)
                      </span>
                    </div>
                  </>
                )}
              </div>

              {/* --- NEW: Display Extra Packages if selected --- */}
              {selectedPackages.length > 0 && (
                <div className="mb-6 pb-6 border-b border-slate-100">
                  <span className="block text-xs font-bold text-slate-900 uppercase tracking-widest mb-3 flex items-center gap-2">
                    <Gift size={14} className="text-blue-500" /> Selected
                    Add-ons
                  </span>
                  <ul className="space-y-2">
                    {selectedPackages.map((pkg, idx) => (
                      <li
                        key={idx}
                        className="text-sm text-slate-600 flex justify-between items-center bg-slate-50 p-2 rounded-lg"
                      >
                        <span>{pkg}</span>
                        <span className="text-xs text-blue-600 font-medium">
                          Quote pending
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              <div className="flex justify-between items-end mt-6">
                <div>
                  <span className="block font-bold text-slate-900 mb-1">
                    Total Room Bill
                  </span>
                  <span className="text-[10px] text-slate-400 uppercase tracking-widest">
                    {currency} Currency
                  </span>
                </div>
                <div className="text-right">
                  <span className="text-3xl font-serif text-slate-900 block leading-none">
                    {computedTotal > 0
                      ? `${currency} ${computedTotal.toLocaleString()}`
                      : `${currency} ${villa.price.toLocaleString()}`}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default function CheckoutPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-stone-50">
          <div className="animate-pulse flex flex-col items-center">
            <div className="w-8 h-8 border-4 border-slate-900 border-t-transparent rounded-full animate-spin mb-4"></div>
            <p className="text-slate-500 text-sm font-medium tracking-widest uppercase">
              Preparing Checkout...
            </p>
          </div>
        </div>
      }
    >
      <CheckoutContent />
    </Suspense>
  );
}
