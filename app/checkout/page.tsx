// app/checkout/page.tsx
"use client";
import React, { useState, useEffect, useMemo, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  ChevronLeft,
  ShieldCheck,
  MapPin,
  Loader2,
  Calendar,
  Gift,
  AlertTriangle,
} from "lucide-react";
import { createClient, isSupabaseConfigured } from "../utils/supabase";
import { villasData } from "../lib/data";
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
  const [loading, setLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [successNote, setSuccessNote] = useState("");
  /**
   * Set when the property cannot be resolved. Without this the page rendered
   * the loading spinner forever, because `villa` simply never arrived.
   */
  const [loadError, setLoadError] = useState("");

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

    // Same catalogue the listings and detail pages fall back to.
    const applyBundledVilla = (id: string): boolean => {
      const match = villasData.find((v) => String(v.id) === String(id));
      if (match) setVilla(match);
      return Boolean(match);
    };

    const fetchVilla = async () => {
      if (!villaIdParam) {
        setLoadError(
          "No property was specified. Please choose an apartment first.",
        );
        return;
      }

      // No database configured yet — resolve from the bundled catalogue so
      // the booking flow is still walkable end to end.
      if (!isSupabaseConfigured()) {
        if (!applyBundledVilla(villaIdParam)) {
          setLoadError(
            "We could not find that property. It may have been removed.",
          );
        }
        return;
      }

      try {
        const { data, error } = await supabase
          .from("villas")
          .select("*")
          .eq("id", villaIdParam)
          .single();

        if (error || !data) {
          setLoadError(
            "We could not load this property. It may have been removed, or the booking system is temporarily unavailable.",
          );
          return;
        }
        setVilla({ ...data, hasPool: data.has_pool } as VillaProps);
      } catch {
        setLoadError(
          "We could not reach the booking system. Please check your connection and try again.",
        );
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
        // With no database there is nothing to persist, so say that plainly
        // instead of implying a reservation was recorded.
        if (!isSupabaseConfigured()) {
          setSuccessNote(
            "Demo mode: neither Paystack nor the database is connected yet, so no payment was taken and nothing was saved. Add your Supabase and Paystack keys to complete a real booking.",
          );
          setIsSuccess(true);
          setTimeout(() => router.push("/"), 9000);
          return;
        }

        // Record a pending request without taking payment.
        //
        // This goes through a server route, NOT a direct insert. `bookings`
        // holds guest contact details, so its policies are closed to the
        // anonymous role — a browser-side insert is rejected by row-level
        // security and the reservation vanishes with no visible error.
        const requestResponse = await fetch("/api/bookings/request", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            villaId: villa.id,
            villaTitle: villa.title,
            guestName,
            guestEmail: formData.email,
            guestPhone: formData.phone,
            checkIn: checkInDate,
            checkOut: checkOutDate,
            nights: totalNights,
            rate: selectedRate,
            totalAmount: displayAmount,
            currency,
            packages: selectedPackages,
          }),
        });

        const requestPayload = (await requestResponse.json().catch(() => null)) as
          | { successful?: boolean; error?: string }
          | null;

        if (!requestResponse.ok || !requestPayload?.successful) {
          setErrorMessage(
            requestPayload?.error ||
              "Could not save your request. Please try again or contact us.",
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
      <div className="min-h-screen flex items-center justify-center bg-[var(--color-canvas)] px-4">
        <div className="bg-white p-10 md:p-12 rounded-3xl shadow-lg text-center max-w-md w-full">
          <div className="w-20 h-20 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto mb-6">
            <ShieldCheck size={40} />
          </div>
          <h2 className="mb-4 text-2xl font-semibold tracking-tight text-[var(--color-ink)]">
            Booking received
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
          <div className="animate-pulse text-xs font-semibold text-[var(--color-faint)]">
            Redirecting to home…
          </div>
        </div>
      </div>
    );
  }

  // --- Unresolvable property ----------------------------------------------
  if (loadError) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[var(--color-canvas)] px-4">
        <div className="w-full max-w-md rounded-2xl border border-[var(--color-line)] bg-white p-8 text-center shadow-[var(--shadow-raise)]">
          <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-full bg-amber-50 text-amber-600">
            <AlertTriangle size={26} />
          </div>
          <h2 className="text-xl font-semibold tracking-tight text-[var(--color-ink)]">
            This booking can&apos;t be completed
          </h2>
          <p className="mt-2 text-sm leading-relaxed text-[var(--color-muted)]">
            {loadError}
          </p>
          <div className="mt-7 flex flex-col gap-3 sm:flex-row sm:justify-center">
            <button
              onClick={() => router.push("/")}
              className="btn-ink rounded-lg px-6 py-3 text-sm"
            >
              Browse apartments
            </button>
            <button
              onClick={() => router.back()}
              className="rounded-lg border border-[var(--color-line)] px-6 py-3 text-sm font-semibold text-[var(--color-ink)] transition-colors hover:bg-[var(--color-canvas)]"
            >
              Go back
            </button>
          </div>
        </div>
      </div>
    );
  }

  // --- Loading screen -----------------------------------------------------
  if (!villa) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[var(--color-canvas)]">
        <div className="flex animate-pulse flex-col items-center">
          <div className="mb-4 h-8 w-8 animate-spin rounded-full border-4 border-[var(--color-ink)] border-t-transparent" />
          <p className="text-sm font-medium text-[var(--color-muted)]">
            Loading checkout…
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[var(--color-canvas)] px-4 py-10 font-sans md:px-8 md:py-14 lg:px-12">
      <div className="mx-auto max-w-5xl">
        <button
          onClick={() => router.back()}
          className="mb-6 inline-flex items-center gap-1.5 text-sm font-medium text-[var(--color-muted)] transition-colors hover:text-[var(--color-ink)]"
        >
          <ChevronLeft size={16} /> Back to villa
        </button>

        <h1 className="text-2xl font-semibold tracking-tight text-[var(--color-ink)] sm:text-3xl">
          Confirm and pay
        </h1>
        <p className="mt-2 text-sm text-[var(--color-muted)]">
          Your reservation is confirmed as soon as payment succeeds.
        </p>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-10">
          {/* ---------------- Left: form ---------------- */}
          <div className="lg:col-span-7 space-y-6">
            <form
              onSubmit={handlePaymentSubmit}
              className="rounded-2xl border border-[var(--color-line-soft)] bg-white p-6 shadow-[var(--shadow-raise)] md:p-8"
            >
              <h2 className="mb-6 text-lg font-semibold tracking-tight text-[var(--color-ink)]">
                Guest information
              </h2>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 mb-8">
                <div>
                  <label className="eyebrow mb-2 block">
                    First Name
                  </label>
                  <input
                    required
                    type="text"
                    value={formData.firstName}
                    onChange={(e) =>
                      setFormData({ ...formData, firstName: e.target.value })
                    }
                    className="w-full rounded-lg border border-[var(--color-line)] bg-white px-3.5 py-3 text-sm text-[var(--color-ink)] outline-none transition-colors placeholder:text-[var(--color-faint)] focus:border-[var(--color-ink)]"
                    placeholder="John"
                  />
                </div>
                <div>
                  <label className="eyebrow mb-2 block">
                    Last Name
                  </label>
                  <input
                    required
                    type="text"
                    value={formData.lastName}
                    onChange={(e) =>
                      setFormData({ ...formData, lastName: e.target.value })
                    }
                    className="w-full rounded-lg border border-[var(--color-line)] bg-white px-3.5 py-3 text-sm text-[var(--color-ink)] outline-none transition-colors placeholder:text-[var(--color-faint)] focus:border-[var(--color-ink)]"
                    placeholder="Doe"
                  />
                </div>
                <div className="sm:col-span-2">
                  <label className="eyebrow mb-2 block">
                    Email Address
                  </label>
                  <input
                    required
                    type="email"
                    value={formData.email}
                    onChange={(e) =>
                      setFormData({ ...formData, email: e.target.value })
                    }
                    className="w-full rounded-lg border border-[var(--color-line)] bg-white px-3.5 py-3 text-sm text-[var(--color-ink)] outline-none transition-colors placeholder:text-[var(--color-faint)] focus:border-[var(--color-ink)]"
                    placeholder="john@example.com"
                  />
                </div>
                <div className="sm:col-span-2">
                  <label className="eyebrow mb-2 block">
                    Phone Number
                  </label>
                  <input
                    required
                    type="tel"
                    value={formData.phone}
                    onChange={(e) =>
                      setFormData({ ...formData, phone: e.target.value })
                    }
                    className="w-full rounded-lg border border-[var(--color-line)] bg-white px-3.5 py-3 text-sm text-[var(--color-ink)] outline-none transition-colors placeholder:text-[var(--color-faint)] focus:border-[var(--color-ink)]"
                    placeholder="+233 50 000 0000"
                  />
                </div>
              </div>

              {/* Dates */}
              <h2 className="mb-4 flex items-center gap-2 text-lg font-semibold tracking-tight text-[var(--color-ink)]">
                <Calendar size={17} className="text-[var(--color-muted)]" /> Stay
                dates
              </h2>
              <div className="mb-8 rounded-xl border border-[var(--color-line)] p-4">
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

              {/* No channel picker here. Paystack's hosted page already
                  presents every channel enabled on the account (card, mobile
                  money, bank transfer), and a choice made here could not
                  restrict it anyway — it would only add a step that does
                  nothing. */}
              <h2 className="mb-4 text-lg font-semibold tracking-tight text-[var(--color-ink)]">
                Payment
              </h2>
              <p className="mb-6 text-xs text-[var(--color-muted)]">
                You will be redirected to Paystack, where you can pay by card or
                mobile money.
              </p>

              {(errorMessage || stayError) && (
                <p className="mb-4 text-sm text-red-600 bg-red-50 border border-red-100 rounded-xl p-3 leading-relaxed">
                  {errorMessage || stayError}
                </p>
              )}

              <button
                type="submit"
                disabled={loading || Boolean(stayError) || totalNights === 0}
                className="btn-accent flex w-full items-center justify-center gap-2 rounded-xl py-4 text-sm"
              >
                {loading ? (
                  <>
                    <Loader2 size={16} className="animate-spin" /> Starting
                    payment...
                  </>
                ) : totalNights === 0 ? (
                  "Select dates to continue"
                ) : (
                  `Pay ${formatPrice(displayAmount, currency)}`
                )}
              </button>
              <div className="mt-4 flex items-center justify-center gap-2 text-xs font-medium text-[var(--color-muted)]">
                <ShieldCheck size={14} /> Secured by Paystack
              </div>
            </form>
          </div>

          {/* ---------------- Right: summary ---------------- */}
          <div className="lg:col-span-5">
            <div className="rounded-2xl border border-[var(--color-line)] bg-white p-6 shadow-[var(--shadow-card)] lg:sticky lg:top-24">
              <h2 className="mb-6 text-lg font-semibold tracking-tight text-[var(--color-ink)]">
                Booking summary
              </h2>

              <div className="flex gap-4 mb-6 pb-6 border-b border-slate-100">
                <img
                  src={villa.image}
                  alt={villa.title}
                  className="w-24 h-24 object-cover rounded-xl shrink-0"
                />
                <div className="min-w-0">
                  <h3 className="font-semibold text-[var(--color-ink)]">
                    {villa.title}
                  </h3>
                  <div className="mb-2 mt-1 flex items-center gap-1 text-xs text-[var(--color-muted)]">
                    <MapPin size={11} /> {villa.location}
                  </div>
                  <span className="text-xs bg-slate-100 text-slate-600 px-2 py-1 rounded-md font-medium">
                    {villa.bedrooms} Beds • {villa.guests} Guests
                  </span>
                </div>
              </div>

              <div className="space-y-4 mb-6 pb-6 border-b border-slate-100 text-sm">
                <div className="flex justify-between text-slate-600">
                  <span>Selected Rate</span>
                  <span className="font-medium text-[var(--color-ink)]">
                    {selectedRate || "Standard"}
                  </span>
                </div>
                {totalNights > 0 && (
                  <>
                    <div className="flex justify-between text-slate-600">
                      <span>Check-in</span>
                      <span className="font-medium text-[var(--color-ink)]">
                        {checkInDate}
                      </span>
                    </div>
                    <div className="flex justify-between text-slate-600">
                      <span>Check-out</span>
                      <span className="font-medium text-[var(--color-ink)]">
                        {checkOutDate}
                      </span>
                    </div>
                    <div className="flex justify-between text-slate-600">
                      <span>Duration</span>
                      <span className="font-medium text-[var(--color-ink)]">
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
                <span className="text-2xl font-semibold tracking-tight leading-none text-[var(--color-ink)] md:text-3xl">
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
        <div className="min-h-screen flex items-center justify-center bg-[var(--color-canvas)]">
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
