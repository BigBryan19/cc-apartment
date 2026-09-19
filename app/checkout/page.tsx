// app/checkout/page.tsx
"use client";
import React, { useState, useEffect, useMemo, Suspense } from "react";
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
  AlertTriangle,
} from "lucide-react";
import { createClient } from "../utils/supabase";
import { VillaProps } from "../components/villas/types";
import DateRangePicker from "../components/booking/DateRangePicker";
import { useVillaAvailability } from "../lib/availability";
import { nightsBetween, validateStay } from "../lib/dates";
import { formatPrice } from "../components/villas/utils";

/**
 * When the Paystack keys are not configured we still record the reservation as
 * a pending request so the flow remains testable. The guest is told plainly
 * that no payment was taken. Set to false to hard-require online payment.
 */
const ALLOW_UNPAID_FALLBACK = true;

const CheckoutContent = () => {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [villa, setVilla] = useState<VillaProps | null>(null);
  const [selectedRate, setSelectedRate] = useState<string>("");
  const [currency, setCurrency] = useState<"GHS" | "USD">("GHS");
  const [paymentMethod, setPaymentMethod] = useState<"card" | "mobile_money">(
    "card",
  );
  const [loading, setLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [successNote, setSuccessNote] = useState("");

  const [checkInDate, setCheckInDate] = useState<string>("");
  const [checkOutDate, setCheckOutDate] = useState<string>("");
  const [selectedPackages, setSelectedPackages] = useState<string[]>([]);

  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
  });

  const villaIdParam = searchParams.get("villaId");
  const numericVillaId = villaIdParam ? Number(villaIdParam) : null;

  // Live availability for the property being booked.
  const availability = useVillaAvailability(
    numericVillaId !== null && !Number.isNaN(numericVillaId)
      ? numericVillaId
      : null,
  );

  const supabase = useMemo(() => createClient(), []);

  useEffect(() => {
    const rate = searchParams.get("rate");
    const curr = searchParams.get("currency");
    const checkInParam = searchParams.get("checkIn");
    const checkOutParam = searchParams.get("checkOut");
    const packagesParam = searchParams.get("packages");

    const fetchVilla = async () => {
      if (villaIdParam) {
        const { data, error } = await supabase
          .from("villas")
          .select("*")
          .eq("id", villaIdParam)
          .single();

        if (data && !error) {
          setVilla({ ...data, hasPool: data.has_pool } as VillaProps);
        }
      }
    };
    fetchVilla();

    if (rate) setSelectedRate(rate);
    if (curr === "USD" || curr === "GHS") setCurrency(curr);
    if (checkInParam) setCheckInDate(checkInParam);
    if (checkOutParam) setCheckOutDate(checkOutParam);
    if (packagesParam)
      setSelectedPackages(packagesParam.split(",").filter(Boolean));
  }, [searchParams, supabase, villaIdParam]);

  // --- Pricing: always recomputed from the chosen dates -------------------
  const rateAmount = useMemo(() => {
    if (!villa) return 0;
    const match = villa.rates?.find((r) => r.option === selectedRate);
    return match?.amount ?? villa.price;
  }, [villa, selectedRate]);

  const totalNights = useMemo(
    () => nightsBetween(checkInDate, checkOutDate),
    [checkInDate, checkOutDate],
  );

  const computedTotal = totalNights * rateAmount;

  const stayError = useMemo(
    () =>
      checkInDate && checkOutDate
        ? validateStay(checkInDate, checkOutDate, availability.all)
        : null,
    [checkInDate, checkOutDate, availability.all],
  );

  const displayAmount = computedTotal > 0 ? computedTotal : (villa?.price ?? 0);

  // --- Submit -------------------------------------------------------------
  const handlePaymentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage("");

    if (!formData.email || !formData.firstName) {
      setErrorMessage("Please provide your name and email address.");
      return;
    }
    if (!checkInDate || !checkOutDate) {
      setErrorMessage("Please select your check-in and check-out dates.");
      return;
    }
    if (stayError) {
      setErrorMessage(stayError);
      return;
    }
    if (!villa) {
      setErrorMessage("The property could not be loaded. Please go back and retry.");
      return;
    }

    setLoading(true);

    const guestName = `${formData.firstName} ${formData.lastName}`.trim();

    try {
      // 1) Ask the server to create the Paystack transaction.
      const response = await fetch("/api/payments/paystack/initialize", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: formData.email,
          amount: displayAmount,
          currency,
          villaId: villa.id,
          villaTitle: villa.title,
          rate: selectedRate,
          checkIn: checkInDate,
          checkOut: checkOutDate,
          nights: totalNights,
          packages: selectedPackages,
          guestName,
          guestPhone: formData.phone,
        }),
      });

      const payload = (await response.json()) as {
        authorizationUrl?: string;
        error?: string;
      };

      if (response.ok && payload.authorizationUrl) {
        // Hand off to Paystack's hosted checkout.
        window.location.href = payload.authorizationUrl;
        return;
      }

      const gatewayMissing =
        response.status === 503 || /not configured/i.test(payload.error ?? "");

      if (gatewayMissing && ALLOW_UNPAID_FALLBACK) {
        // Record a pending request without taking payment.
        const { error } = await supabase.from("bookings").insert([
          {
            villa_id: villa.id,
            guest_name: guestName,
            guest_email: formData.email,
            guest_phone: formData.phone,
            check_in_date: checkInDate,
            total_amount: displayAmount,
            payment_method: paymentMethod,
            status: "pending",
          },
        ]);

        if (error) {
          setErrorMessage(
            `Could not save your reservation: ${error.message}`,
          );
        } else {
          setSuccessNote(
            "The payment gateway is not configured yet, so no payment was taken. Your request has been recorded as pending and our team will contact you.",
          );
          setIsSuccess(true);
          setTimeout(() => router.push("/"), 6000);
        }
        return;
      }

      setErrorMessage(payload.error || "We could not start the payment. Please try again.");
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "A network error stopped the payment from starting.",
      );
    } finally {
      setLoading(false);
    }
  };

  // --- Success screen -----------------------------------------------------
  if (isSuccess) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-stone-50 px-4">
        <div className="bg-white p-10 md:p-12 rounded-3xl shadow-lg text-center max-w-md w-full">
          <div className="w-20 h-20 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto mb-6">
            <ShieldCheck size={40} />
          </div>
          <h2 className="text-3xl font-serif text-slate-900 mb-4">
            Booking Received!
          </h2>
          <p className="text-slate-500 mb-6 leading-relaxed">
            Thank you, {formData.firstName}. We have received your reservation
            request. Our team will contact you shortly to confirm.
          </p>
          {successNote && (
            <p className="mb-6 flex items-start gap-2 text-left text-xs text-amber-700 bg-amber-50 border border-amber-100 rounded-xl p-3 leading-relaxed">
              <AlertTriangle size={14} className="mt-0.5 shrink-0" />
              {successNote}
            </p>
          )}
          <div className="animate-pulse text-xs font-bold text-slate-400 uppercase tracking-widest">
            Redirecting to home...
          </div>
        </div>
      </div>
    );
  }

  // --- Loading screen -----------------------------------------------------
  if (!villa) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-stone-50">
        <div className="animate-pulse flex flex-col items-center">
          <div className="w-8 h-8 border-4 border-slate-900 border-t-transparent rounded-full animate-spin mb-4" />
          <p className="text-slate-500 text-sm font-medium tracking-widest uppercase">
            Loading Checkout...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-stone-50 py-10 md:py-12 px-4 md:px-8 lg:px-12 font-sans">
      <div className="max-w-5xl mx-auto">
        <button
          onClick={() => router.back()}
          className="flex items-center gap-2 text-sm font-bold text-slate-500 hover:text-slate-900 transition mb-8 uppercase tracking-widest"
        >
          <ChevronLeft size={16} /> Back to Villa
        </button>

        <h1 className="text-3xl md:text-4xl font-serif text-slate-900 mb-8">
          Secure Checkout
        </h1>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-10">
          {/* ---------------- Left: form ---------------- */}
          <div className="lg:col-span-7 space-y-6">
            <form
              onSubmit={handlePaymentSubmit}
              className="bg-white p-6 md:p-8 rounded-2xl shadow-sm border border-slate-100"
            >
              <h2 className="text-xl font-serif text-slate-900 mb-6">
                Guest Information
              </h2>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 mb-8">
                <div>
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
                <div>
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
                <div className="sm:col-span-2">
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
                <div className="sm:col-span-2">
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
              </div>

              {/* Dates */}
              <h2 className="text-xl font-serif text-slate-900 mb-4 flex items-center gap-2">
                <Calendar size={18} className="text-slate-400" /> Stay Dates
              </h2>
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 mb-8">
                <DateRangePicker
                  checkIn={checkInDate}
                  checkOut={checkOutDate}
                  unavailableRanges={availability.all}
                  onChange={(nextIn, nextOut) => {
                    setCheckInDate(nextIn);
                    setCheckOutDate(nextOut);
                  }}
                  message={
                    availability.error
                      ? "Live availability is unavailable — showing the default booking window only."
                      : undefined
                  }
                />
              </div>

              {/* Payment method */}
              <h2 className="text-xl font-serif text-slate-900 mb-4">
                Payment Method
              </h2>
              <div className="grid grid-cols-2 gap-4 mb-2">
                <div
                  onClick={() => setPaymentMethod("card")}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => e.key === "Enter" && setPaymentMethod("card")}
                  className={`border rounded-xl p-4 flex flex-col items-center justify-center gap-2 cursor-pointer transition ${
                    paymentMethod === "card"
                      ? "border-slate-900 bg-slate-50 text-slate-900 shadow-inner"
                      : "border-slate-200 text-slate-500 hover:border-slate-300"
                  }`}
                >
                  <CreditCard size={24} />
                  <span className="text-xs font-bold uppercase tracking-widest text-center">
                    Card
                  </span>
                </div>
                <div
                  onClick={() => setPaymentMethod("mobile_money")}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) =>
                    e.key === "Enter" && setPaymentMethod("mobile_money")
                  }
                  className={`border rounded-xl p-4 flex flex-col items-center justify-center gap-2 cursor-pointer transition ${
                    paymentMethod === "mobile_money"
                      ? "border-slate-900 bg-slate-50 text-slate-900 shadow-inner"
                      : "border-slate-200 text-slate-500 hover:border-slate-300"
                  }`}
                >
                  <Smartphone size={24} />
                  <span className="text-xs font-bold uppercase tracking-widest text-center">
                    Mobile Money
                  </span>
                </div>
              </div>
              <p className="text-[11px] text-slate-400 mb-6">
                You will be redirected to Paystack to complete payment securely.
              </p>

              {(errorMessage || stayError) && (
                <p className="mb-4 text-sm text-red-600 bg-red-50 border border-red-100 rounded-xl p-3 leading-relaxed">
                  {errorMessage || stayError}
                </p>
              )}

              <button
                type="submit"
                disabled={loading || Boolean(stayError) || totalNights === 0}
                className="w-full bg-slate-900 text-white py-4 rounded-xl font-bold uppercase tracking-widest text-sm hover:bg-slate-800 transition shadow-lg flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? (
                  <>
                    <Loader2 size={16} className="animate-spin" /> Starting
                    payment...
                  </>
                ) : totalNights === 0 ? (
                  "Select Dates to Continue"
                ) : (
                  `Pay ${formatPrice(displayAmount, currency)}`
                )}
              </button>
              <div className="flex items-center justify-center gap-2 mt-4 text-xs text-slate-400 font-medium">
                <ShieldCheck size={14} /> Payments are secure and encrypted
              </div>
            </form>
          </div>

          {/* ---------------- Right: summary ---------------- */}
          <div className="lg:col-span-5">
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 lg:sticky lg:top-24">
              <h2 className="text-xl font-serif text-slate-900 mb-6">
                Booking Summary
              </h2>

              <div className="flex gap-4 mb-6 pb-6 border-b border-slate-100">
                <img
                  src={villa.image}
                  alt={villa.title}
                  className="w-24 h-24 object-cover rounded-xl shrink-0"
                />
                <div className="min-w-0">
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
                {totalNights > 0 && (
                  <>
                    <div className="flex justify-between text-slate-600">
                      <span>Check-in</span>
                      <span className="font-medium text-slate-900">
                        {checkInDate}
                      </span>
                    </div>
                    <div className="flex justify-between text-slate-600">
                      <span>Check-out</span>
                      <span className="font-medium text-slate-900">
                        {checkOutDate}
                      </span>
                    </div>
                    <div className="flex justify-between text-slate-600">
                      <span>Duration</span>
                      <span className="font-medium text-slate-900">
                        {totalNights} Night{totalNights === 1 ? "" : "s"}
                      </span>
                    </div>
                  </>
                )}
              </div>

              {selectedPackages.length > 0 && (
                <div className="mb-6 pb-6 border-b border-slate-100">
                  <span className="text-xs font-bold text-slate-900 uppercase tracking-widest mb-3 flex items-center gap-2">
                    <Gift size={14} className="text-blue-500" /> Selected Add-ons
                  </span>
                  <ul className="space-y-2">
                    {selectedPackages.map((pkg) => (
                      <li
                        key={pkg}
                        className="text-sm text-slate-600 flex justify-between items-center gap-3 bg-slate-50 p-2 rounded-lg"
                      >
                        <span className="truncate">{pkg}</span>
                        <span className="text-xs text-blue-600 font-medium shrink-0">
                          Quote pending
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              <div className="flex justify-between items-end gap-4">
                <div>
                  <span className="block font-bold text-slate-900 mb-1">
                    Total Room Bill
                  </span>
                  <span className="text-[10px] text-slate-400 uppercase tracking-widest">
                    {currency} Currency
                  </span>
                </div>
                <span className="text-2xl md:text-3xl font-serif text-slate-900 leading-none">
                  {formatPrice(displayAmount, currency)}
                </span>
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
            <div className="w-8 h-8 border-4 border-slate-900 border-t-transparent rounded-full animate-spin mb-4" />
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
