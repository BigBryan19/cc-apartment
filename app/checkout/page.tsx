// app/checkout/page.tsx
"use client";
import React, { useState, useEffect, useMemo, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  ChevronLeft,
  ChevronDown,
  ShieldCheck,
  MapPin,
  Loader2,
  Calendar,
  Gift,
  AlertTriangle,
} from "lucide-react";
import { createClient, isSupabaseConfigured } from "../utils/supabase";
import { bundledVillas as villasData, toVillaProps } from "../lib/catalog";
import { buildQuote, type ExtraInput } from "../lib/quote";
import {
  isEnquiryOnly,
  priceBasisSuffix,
  resolveUnit,
  unitCapacityLabel,
} from "../lib/rates";
import { EXTRAS, EXTRAS_BY_ID } from "../lib/extras";
import { VillaProps } from "../components/villas/types";
import StayDateFields from "../components/booking/StayDateFields";
import { useVillaAvailability } from "../lib/availability";
import { nightsBetween, validateStay } from "../lib/dates";
import { formatPrice } from "../components/villas/utils";
import { SETTINGS_TABLE } from "../lib/tables";
import {
  DEFAULT_DEPOSIT_POLICY,
  MIN_DEPOSIT_PERCENT,
  NO_DEPOSIT_POLICY,
  balanceDueDateKey,
  balanceTermsNote,
  clampPercent,
  isDepositConfigured,
  parseDepositPolicy,
  policyFromEnv,
  resolveDue,
  type DepositPolicy,
  type PaymentPlan,
} from "../lib/deposit";
import { whatsappLink } from "../lib/contact";

/**
 * When the Payaza keys are not configured we still record the reservation as
 * a pending request so the flow remains testable. The guest is told plainly
 * that no payment was taken. Set to false to hard-require online payment.
 */
const ALLOW_UNPAID_FALLBACK = true;

const CheckoutContent = () => {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [villa, setVilla] = useState<VillaProps | null>(null);
  /**
   * The room the guest picked on the property page.
   *
   * Held as id *and* name: the property page and the checkout can generate
   * different ids for the same room (one resolves the bundled catalogue, the
   * other the database row), and matching on the id alone silently fell back to
   * the cheapest room — which is why every booking arrived at ₵600.
   */
  const [selectedUnitId, setSelectedUnitId] = useState<string>("");
  const [selectedUnitName, setSelectedUnitName] = useState<string>("");
  /** Overnight occupancy. Drives capacity checks and per-person charging. */
  const [guests, setGuests] = useState<number>(2);
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
  /**
   * Add-ons start collapsed. The list is long enough to push the payment panel
   * below the fold, so it opens on request and the header carries the count of
   * what is already in the booking.
   */
  const [addOnsOpen, setAddOnsOpen] = useState(false);

  /**
   * Deposit policy, resolved from the owner's settings. Starts unconfigured so
   * the page never flashes a deposit amount that has not been loaded.
   */
  const [depositPolicy, setDepositPolicy] = useState<DepositPolicy>(DEFAULT_DEPOSIT_POLICY);
  const [paymentPlan, setPaymentPlan] = useState<PaymentPlan>("full");
  /** Share the guest has chosen to pay now; the policy enforces the 30% floor. */
  const [depositPercent, setDepositPercent] = useState(MIN_DEPOSIT_PERCENT);

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

  /*
   * The deposit policy is public information — the guest has to see the terms
   * before paying — so it is read straight from `site_settings`. The environment
   * fallback covers a deployment where the SQL migration has not been run yet.
   * An unreadable policy stays "unconfigured", which shows pay-in-full only,
   * rather than defaulting to a percentage nobody approved.
   */
  /* eslint-disable react-hooks/set-state-in-effect -- policy is fetched once on mount */
  useEffect(() => {
    const fromEnv = policyFromEnv("client");
    if (isDepositConfigured(fromEnv)) setDepositPolicy(fromEnv);

    if (!isSupabaseConfigured()) return;
    let cancelled = false;

    Promise.resolve(
      createClient()
        .from(SETTINGS_TABLE)
        .select("value")
        .eq("key", "deposit_policy")
        .maybeSingle(),
    )
      .then(({ data }) => {
        if (cancelled || !data) return;
        const parsed = parseDepositPolicy((data as { value?: unknown }).value);
        if (isDepositConfigured(parsed)) setDepositPolicy(parsed);
      })
      .catch(() => {
        /* Leave the policy unconfigured; the UI offers an enquiry instead. */
      });

    return () => {
      cancelled = true;
    };
  }, []);
  /* eslint-enable react-hooks/set-state-in-effect */

  /*
   * Seeds the form from the query string the villa page linked with. Written as
   * an effect, not useState initialisers, because this page is statically
   * prerendered and `useSearchParams` is only authoritative on the client —
   * seeding state from it during the initial render would mismatch hydration.
   * Suppressed rather than restructured: this is the payment form.
   */
  /* eslint-disable react-hooks/set-state-in-effect -- URL-derived form seed; see comment above */
  useEffect(() => {
    const rate = searchParams.get("unitId") || searchParams.get("rate");
    setSelectedUnitId(rate ?? "");
    setSelectedUnitName(searchParams.get("unitName") ?? "");
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
        // Through toVillaProps, not a spread with an `as` cast. The cast hid the
        // fact that `units` was never populated, which crashed the deployed page
        // and, here, would have crashed the checkout for every guest.
        setVilla(toVillaProps(data as never));
      } catch {
        setLoadError(
          "We could not reach the booking system. Please check your connection and try again.",
        );
      }
    };
    fetchVilla();

    if (rate) setSelectedUnitId(rate);
    if (curr === "USD" || curr === "GHS") setCurrency(curr);
    // Carried from the property page so the guest count the room was chosen for
    // is the count the quote and the request use.
    const guestsParam = Number(searchParams.get("guests"));
    if (Number.isFinite(guestsParam) && guestsParam >= 1) {
      setGuests(Math.min(60, Math.floor(guestsParam)));
    }
    if (checkInParam) setCheckInDate(checkInParam);
    if (checkOutParam) setCheckOutDate(checkOutParam);
    if (packagesParam)
      setSelectedPackages(packagesParam.split(",").filter(Boolean));
  }, [searchParams, supabase, villaIdParam]);
  /* eslint-enable react-hooks/set-state-in-effect */

  // --- Pricing -------------------------------------------------------------
  // Computed with the SAME engine the server uses (app/lib/quote.ts), so the
  // summary on this page and the amount actually charged cannot drift. The
  // server still re-derives everything from its own records and ignores
  // anything this page sends about money.
  const totalNights = useMemo(
    () => nightsBetween(checkInDate, checkOutDate),
    [checkInDate, checkOutDate],
  );

  const selectedUnit = resolveUnit(villa?.units ?? [], selectedUnitId, selectedUnitName);

  /**
   * Rental days for the car. Defaults to the length of the stay, because that is
   * what most guests want, but the guest can hire it for fewer days. Clamped
   * server-side as well; this only keeps the field honest.
   */
  const [rentalDays, setRentalDays] = useState<string>("");
  const rentalDayCount = Math.min(
    90,
    Math.max(1, Number(rentalDays) || totalNights || 1),
  );

  const extraInputs: ExtraInput[] = useMemo(
    () =>
      selectedPackages
        .map((id) => EXTRAS_BY_ID[id])
        .filter(Boolean)
        // `amount: null` for anything the owner has not priced, which is
        // everything today. The engine then lists it as an unpriced line and
        // keeps it out of the payable total.
        .map((extra) => ({
          id: extra.id,
          name: extra.name,
          amount: extra.requiresQuote ? null : extra.amount,
          priceBasis: extra.priceBasis,
          // A rental is charged per day held, and the guest chooses those days.
          quantity:
            extra.priceBasis === "per_day" ? rentalDayCount : undefined,
        })),
    [selectedPackages, rentalDayCount],
  );

  const quoteResult = useMemo(() => {
    if (!villa || !selectedUnit || totalNights <= 0) return null;
    return buildQuote({
      unit: selectedUnit,
      propertyName: villa.title,
      nights: totalNights,
      guests,
      extras: extraInputs,
      fees: [],
      discounts: [],
      deposit: null,
    });
  }, [villa, selectedUnit, totalNights, guests, extraInputs]);

  const quote = quoteResult?.ok ? quoteResult.quote : null;
  const quoteRefusal = quoteResult && !quoteResult.ok ? quoteResult.reason : null;

  // `quote.total` excludes anything still awaiting a quote. What is charged
  // today is then decided by the payment plan and the owner's deposit policy.
  const bookingTotal = quote?.total ?? 0;

  const due = resolveDue(bookingTotal, depositPolicy, paymentPlan, depositPercent);
  const depositConfigured = isDepositConfigured(depositPolicy);
  // Falls back to pay-in-full whenever a deposit was requested but is not
  // configured, so the button can never show a figure that does not exist.
  const activePlan: PaymentPlan = due.unavailable ? "full" : due.plan;

  const computedTotal = due.unavailable ? bookingTotal : due.dueNow;
  const balanceDueDate =
    activePlan === "deposit" ? balanceDueDateKey(checkInDate, depositPolicy) : null;
  const balanceNote = balanceTermsNote(depositPolicy);

  const stayError = useMemo(
    () =>
      checkInDate && checkOutDate
        ? validateStay(checkInDate, checkOutDate, availability.all)
        : null,
    [checkInDate, checkOutDate, availability.all],
  );

  // Zero is a legitimate refusal, not a missing price, so it is not papered over
  // with the property's headline figure the way it used to be.
  const displayAmount = computedTotal;

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
      // 1) Ask the server to create the Payaza transaction.
      //
      // NOTE: `amount` and `nights` are deliberately NOT sent. The server prices
      // the stay from the property row and the two dates (app/lib/pricing.ts),
      // and ignores anything the browser says about money. `displayAmount` above
      // is for showing the guest a total before they commit — it is never the
      // figure that gets charged.
      const response = await fetch("/api/payments/payaza/initialize", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: formData.email,
          currency,
          villaId: villa.id,
          // Identifiers and inputs only — no amount, no nights, no total. The
          // server resolves and prices from its own records (app/lib/pricing.ts)
          // and ignores anything money-shaped in this body.
          unitId: selectedUnit?.id ?? selectedUnitId,
          guests,
          checkIn: checkInDate,
          checkOut: checkOutDate,
          extraIds: selectedPackages,
          guestName,
          guestPhone: formData.phone,
          // The plan is an input, not a price. The server re-reads the policy
          // and computes what to charge from its own records.
          paymentPlan: activePlan,
          depositPercent: due.percent,
        }),
      });

      const payload = (await response.json()) as {
        authorizationUrl?: string;
        error?: string;
        amount?: number;
        nights?: number;
      };

      // The server's figure is authoritative. If it disagrees with what we
      // showed the guest, stop and say so rather than sending them to pay a
      // different number than the one on the button.
      if (
        response.ok &&
        typeof payload.amount === "number" &&
        Math.abs(payload.amount - displayAmount) > 0.01
      ) {
        setErrorMessage(
          `The price for these dates is ${formatPrice(payload.amount, currency)}, ` +
            `not ${formatPrice(displayAmount, currency)}. Please review and try again.`,
        );
        setLoading(false);
        return;
      }

      if (response.ok && payload.authorizationUrl) {
        // Hand off to Paystack's hosted checkout.
        window.location.href = payload.authorizationUrl;
        return;
      }

      // Only the *gateway* being unconfigured should fall through to the
      // no-payment path. The initialize route also returns 503 when it cannot
      // persist a booking — treating that as "demo mode" would tell the guest
      // their request was recorded when nothing was saved.
      const gatewayMissing =
        response.status === 503 && /payment gateway is not configured/i.test(payload.error ?? "");

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
            rate: selectedUnitId,
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
                  <label htmlFor="checkout-first-name" className="eyebrow mb-2 block">
                    First Name
                  </label>
                  <input
                    id="checkout-first-name"
                    name="firstName"
                    autoComplete="given-name"
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
                  <label htmlFor="checkout-last-name" className="eyebrow mb-2 block">
                    Last Name
                  </label>
                  <input
                    id="checkout-last-name"
                    name="lastName"
                    autoComplete="family-name"
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
                  <label htmlFor="checkout-email" className="eyebrow mb-2 block">
                    Email Address
                  </label>
                  <input
                    id="checkout-email"
                    name="email"
                    autoComplete="email"
                    inputMode="email"
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
                  <label htmlFor="checkout-phone" className="eyebrow mb-2 block">
                    Phone Number
                  </label>
                  <input
                    id="checkout-phone"
                    name="phone"
                    autoComplete="tel"
                    // tel + inputMode keeps the numeric keyboard up on phones
                    // without blocking the + used by international numbers.
                    inputMode="tel"
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
                <StayDateFields
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

              {/* Pay in full, or reserve with a part payment of 30% or more. */}
              <fieldset className="mb-6 space-y-3">
                <legend className="eyebrow mb-2">How would you like to pay?</legend>

                <label
                  className={`flex cursor-pointer items-start gap-3 rounded-xl border p-4 transition-colors ${
                    activePlan === "full"
                      ? "border-[var(--color-ink)] bg-white"
                      : "border-[var(--color-line)] bg-white"
                  }`}
                >
                  <input
                    type="radio"
                    name="paymentPlan"
                    value="full"
                    checked={activePlan === "full"}
                    onChange={() => setPaymentPlan("full")}
                    className="mt-1 h-4 w-4 accent-[var(--color-ink)]"
                  />
                  <span className="min-w-0">
                    <span className="block text-sm font-semibold text-[var(--color-ink)]">
                      Pay in full
                    </span>
                    <span className="mt-0.5 block text-xs leading-relaxed text-[var(--color-muted)]">
                      {bookingTotal > 0
                        ? `${formatPrice(bookingTotal, currency)} today`
                        : "The full booking total today"}
                    </span>
                  </span>
                </label>

                <label
                  className={`flex cursor-pointer items-start gap-3 rounded-xl border p-4 transition-colors ${
                    activePlan === "deposit"
                      ? "border-[var(--color-ink)] bg-white"
                      : "border-[var(--color-line)] bg-white"
                  }`}
                >
                  <input
                    type="radio"
                    name="paymentPlan"
                    value="deposit"
                    checked={activePlan === "deposit"}
                    onChange={() => setPaymentPlan("deposit")}
                    className="mt-1 h-4 w-4 accent-[var(--color-ink)]"
                  />
                  <span className="min-w-0 flex-1">
                    <span className="flex flex-wrap items-baseline justify-between gap-2">
                      <span className="block text-sm font-semibold text-[var(--color-ink)]">
                        Part payment
                      </span>
                      <span className="text-sm font-semibold text-[var(--color-ink)]">
                        {bookingTotal > 0
                          ? formatPrice(
                              Math.min(
                                bookingTotal,
                                (bookingTotal * clampPercent(depositPercent, depositPolicy)) / 100,
                              ),
                              currency,
                            )
                          : "—"}
                      </span>
                    </span>
                    <span className="mt-0.5 block text-xs leading-relaxed text-[var(--color-muted)]">
                      Reserve with {MIN_DEPOSIT_PERCENT}% or more now
                      {depositPolicy.minPercent > MIN_DEPOSIT_PERCENT
                        ? ` (minimum ${depositPolicy.minPercent}% on this booking)`
                        : ""}
                      , and pay the balance before you arrive.
                    </span>

                    {activePlan === "deposit" && (
                      <span className="mt-3 block">
                        <span className="flex items-center justify-between text-[11px] font-semibold uppercase tracking-wider text-[var(--color-faint)]">
                          <span>Pay now</span>
                          <span className="text-[var(--color-ink)]">
                            {clampPercent(depositPercent, depositPolicy)}%
                          </span>
                        </span>
                        <input
                          type="range"
                          min={Math.max(MIN_DEPOSIT_PERCENT, depositPolicy.minPercent)}
                          max={99}
                          step={1}
                          value={clampPercent(depositPercent, depositPolicy)}
                          onChange={(event) => setDepositPercent(Number(event.target.value))}
                          aria-label="Percentage to pay now"
                          className="mt-2 w-full accent-[var(--color-ink)]"
                        />
                        <span className="mt-1 flex justify-between text-[10px] text-[var(--color-faint)]">
                          <span>{Math.max(MIN_DEPOSIT_PERCENT, depositPolicy.minPercent)}%</span>
                          <span>99%</span>
                        </span>
                      </span>
                    )}
                  </span>
                </label>

                {!depositConfigured && (
                  <p className="rounded-xl border border-dashed border-[var(--color-line)] bg-[var(--color-canvas)] p-3 text-[11px] leading-relaxed text-[var(--color-muted)]">
                    Part payment is currently switched off for this property, so
                    the full amount is due today.
                  </p>
                )}
              </fieldset>

              <p className="mb-6 text-xs text-[var(--color-muted)]">
                You will be redirected to Payaza, where you can pay by card or
                mobile money.
              </p>

              {(errorMessage || stayError) && (
                <p className="mb-4 text-sm text-red-600 bg-red-50 border border-red-100 rounded-xl p-3 leading-relaxed">
                  {errorMessage || stayError}
                </p>
              )}

              <button
                type="submit"
                disabled={
                  loading || Boolean(stayError) || totalNights === 0 || !selectedUnit
                }
                className="btn-accent flex w-full items-center justify-center gap-2 rounded-xl py-4 text-sm"
              >
                {loading ? (
                  <>
                    <Loader2 size={16} className="animate-spin" /> Starting
                    payment...
                  </>
                ) : totalNights === 0 ? (
                  "Select dates to continue"
                ) : activePlan === "deposit" && due.deposit > 0 ? (
                  `Pay deposit ${formatPrice(displayAmount, currency)}`
                ) : (
                  `Pay ${formatPrice(displayAmount, currency)}`
                )}
              </button>
              <div className="mt-4 flex items-center justify-center gap-2 text-xs font-medium text-[var(--color-muted)]">
                <ShieldCheck size={14} /> Secured by Payaza
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
                  {/*
                    The selected UNIT's capacity and facilities. This previously
                    read "{villa.bedrooms} Beds - {villa.guests} Guests" — the
                    whole property — while a single room might be selected, which
                    overstated what the guest was paying for.
                  */}
                  {selectedUnit ? (
                    <div className="space-y-1">
                      <span className="text-xs bg-slate-100 text-slate-600 px-2 py-1 rounded-md font-medium">
                        {selectedUnit.name}
                      </span>
                      {unitCapacityLabel(selectedUnit) && (
                        <p className="text-xs text-slate-500">
                          {unitCapacityLabel(selectedUnit)}
                        </p>
                      )}
                    </div>
                  ) : (
                    <span className="text-xs text-slate-500">
                      Accommodation not selected
                    </span>
                  )}
                </div>
              </div>

              {/* The chosen room could not be matched to this property's current
                  rate list. Rather than quietly charging a different room — the
                  behaviour that produced the ₵600 totals — the guest picks again
                  here and every figure recalculates from that choice. */}
              {villa && !selectedUnit && (
                <div className="mb-6 rounded-xl border border-amber-200 bg-amber-50 p-4">
                  <p className="text-sm font-medium text-amber-900">
                    That room is no longer available at this price.
                  </p>
                  <p className="mt-1 text-xs leading-relaxed text-amber-800">
                    Pick the room you want below — the total updates straight away.
                  </p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {villa.units.map((option) => (
                      <button
                        key={option.id}
                        type="button"
                        onClick={() => {
                          setSelectedUnitId(option.id);
                          setSelectedUnitName(option.name);
                        }}
                        className="rounded-full border border-amber-300 bg-white px-3 py-1.5 text-xs font-medium text-amber-900 transition-colors hover:border-amber-500"
                      >
                        {option.name} — {formatPrice(option.amount, currency)}
                        {priceBasisSuffix(option.priceBasis)}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Occupancy is an input, not an assumption: it drives the
                  capacity check and any per-person charge. */}
              <div className="mb-6 space-y-2 border-b border-slate-100 pb-6">
                <label
                  htmlFor="checkout-guests"
                  className="eyebrow block"
                >
                  Guests staying overnight
                </label>
                <input
                  id="checkout-guests"
                  name="guests"
                  type="number"
                  min={1}
                  max={selectedUnit?.maxGuests ?? 60}
                  value={guests}
                  onChange={(event) =>
                    setGuests(Math.max(1, Number(event.target.value) || 1))
                  }
                  className="w-full rounded-lg border border-[var(--color-line)] bg-white px-3.5 py-2.5 text-sm text-[var(--color-ink)] outline-none transition-colors focus:border-[var(--color-ink)]"
                />
                {selectedUnit?.maxGuests != null && guests > selectedUnit.maxGuests && (
                  <p role="alert" className="text-xs text-red-700">
                    {selectedUnit.name} takes a maximum of {selectedUnit.maxGuests}{" "}
                    guests. Choose a larger option or contact us about your group.
                  </p>
                )}
              </div>

              <div className="space-y-4 mb-6 pb-6 border-b border-slate-100 text-sm">
                <div className="flex justify-between gap-4 text-slate-600">
                  <span>Accommodation</span>
                  <span className="text-right font-medium text-[var(--color-ink)]">
                    {selectedUnit?.name ?? "Not selected"}
                  </span>
                </div>
                <div className="flex justify-between text-slate-600">
                  <span>Guests</span>
                  <span className="font-medium text-[var(--color-ink)]">
                    {guests}
                    {selectedUnit?.maxGuests != null && (
                      <span className="ml-1 text-xs text-slate-400">
                        (max {selectedUnit.maxGuests})
                      </span>
                    )}
                  </span>
                </div>
                {selectedUnit && !isEnquiryOnly(selectedUnit) && (
                  <div className="flex justify-between text-slate-600">
                    <span>Rate</span>
                    <span className="font-medium text-[var(--color-ink)]">
                      {formatPrice(selectedUnit.amount, currency)}{" "}
                      {priceBasisSuffix(selectedUnit.priceBasis)}
                    </span>
                  </div>
                )}
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

              {quoteRefusal && (
                <p role="alert" className="mb-6 rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs leading-relaxed text-amber-900">
                  {quoteRefusal}
                </p>
              )}

              {/*
                Add-ons can be added here, not only on the property page, so the
                massage and the private chef are selectable inside the booking
                journey. A priced add-on is charged; an unpriced one is carried
                as a request and never enters the payable total.
              */}
              <div className="mb-6 rounded-xl border border-slate-200">
                <button
                  type="button"
                  onClick={() => setAddOnsOpen((open) => !open)}
                  aria-expanded={addOnsOpen}
                  aria-controls="add-on-list"
                  className="flex w-full items-center justify-between gap-3 rounded-xl px-4 py-3.5 text-left"
                >
                  <span className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-slate-900">
                    <Gift size={14} className="text-blue-500" /> Add to your stay
                  </span>
                  <span className="flex items-center gap-2 text-xs font-medium text-slate-500">
                    {selectedPackages.length > 0
                      ? `${selectedPackages.length} selected`
                      : "Optional"}
                    <ChevronDown
                      size={16}
                      className={`transition-transform ${addOnsOpen ? "rotate-180" : ""}`}
                      aria-hidden="true"
                    />
                  </span>
                </button>
                <div
                  id="add-on-list"
                  hidden={!addOnsOpen}
                  className="grid gap-2 border-t border-slate-100 p-4 sm:grid-cols-2"
                >
                  {EXTRAS.filter((extra) => extra.active).map((extra) => {
                    const checked = selectedPackages.includes(extra.id);
                    return (
                      <div key={extra.id} className="rounded-lg bg-slate-50 px-3 py-2">
                        <label className="flex cursor-pointer items-start gap-3">
                          <input
                            type="checkbox"
                            checked={checked}
                            onChange={() =>
                              setSelectedPackages((prev) =>
                                prev.includes(extra.id)
                                  ? prev.filter((id) => id !== extra.id)
                                  : [...prev, extra.id],
                              )
                            }
                            className="mt-0.5 h-4 w-4"
                          />
                          <span className="min-w-0 flex-1">
                            <span className="flex flex-wrap items-baseline justify-between gap-2">
                              <span className="text-sm font-medium text-slate-900">{extra.name}</span>
                              <span className="text-xs font-semibold text-slate-700">
                                {extra.amount === null
                                  ? "Price to be confirmed"
                                  : `GHS ${extra.amount.toLocaleString("en-GH")}${
                                      extra.priceBasis === "per_day"
                                        ? " / day"
                                        : " / stay"
                                    }`}
                              </span>
                            </span>
                            <span className="mt-0.5 block text-[11px] leading-relaxed text-slate-500">
                              {extra.note ?? extra.summary}
                            </span>
                          </span>
                        </label>
                        {checked && extra.priceBasis === "per_day" && (
                          <div className="mt-2 flex items-center gap-2 pl-7">
                            <label className="text-[11px] font-medium text-slate-600" htmlFor="rental-days">
                              Rental days
                            </label>
                            <input
                              id="rental-days"
                              type="number"
                              min={1}
                              max={90}
                              value={rentalDays || String(totalNights || 1)}
                              onChange={(event) => setRentalDays(event.target.value)}
                              className="w-20 rounded-lg border border-slate-200 px-2 py-1 text-sm"
                            />
                            <span className="text-[11px] text-slate-500">
                              = GHS {((extra.amount ?? 0) * rentalDayCount).toLocaleString("en-GH")}
                            </span>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
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
                        <span className="truncate">
                          {EXTRAS_BY_ID[pkg]?.name ?? pkg}
                        </span>
                        {/*
                          A priced add-on is charged and says so; only an unpriced
                          one is a request. Labelling both "quoted separately" made
                          a priced car rental look as though it were excluded.
                        */}
                        {EXTRAS_BY_ID[pkg] && !EXTRAS_BY_ID[pkg].requiresQuote ? (
                          <span className="shrink-0 text-right text-xs font-semibold text-slate-900">
                            {EXTRAS_BY_ID[pkg].priceBasis === "per_day"
                              ? `GHS ${(EXTRAS_BY_ID[pkg].amount ?? 0).toLocaleString("en-GH")} × ${rentalDayCount} day${rentalDayCount === 1 ? "" : "s"}`
                              : `GHS ${(EXTRAS_BY_ID[pkg].amount ?? 0).toLocaleString("en-GH")}`}
                            <span className="block text-[10px] font-normal text-slate-500">
                              in the total
                            </span>
                          </span>
                        ) : (
                          <span className="shrink-0 text-right text-xs font-medium text-amber-700">
                            Price to be confirmed
                            <span className="block text-[10px] font-normal text-slate-500">
                              not in the total
                            </span>
                          </span>
                        )}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {quote && quote.unpricedItems.length > 0 && (
                <ul className="mb-5 space-y-1.5 rounded-xl border border-slate-200 bg-slate-50 p-4 text-xs text-slate-600">
                  {quote.unpricedItems.map((item) => (
                    <li key={item} className="flex justify-between gap-3">
                      <span>{item}</span>
                      <span className="shrink-0 font-medium text-amber-700">
                        Quoted separately
                      </span>
                    </li>
                  ))}
                </ul>
              )}

              {/* Deposit breakdown. Shown whenever a deposit is actually being
                  taken, so the guest sees the full cost, what leaves their
                  account today, and what is still owed — before paying. */}
              {activePlan === "deposit" && due.deposit > 0 && (
                <dl className="mb-5 space-y-2 rounded-xl border border-[var(--color-line)] bg-[var(--color-canvas)] p-4 text-sm">
                  <div className="flex justify-between gap-4">
                    <dt className="text-[var(--color-muted)]">Booking total</dt>
                    <dd className="font-medium text-[var(--color-ink)]">
                      {formatPrice(bookingTotal, currency)}
                    </dd>
                  </div>
                  <div className="flex justify-between gap-4">
                    <dt className="text-[var(--color-muted)]">Deposit due now</dt>
                    <dd className="font-semibold text-[var(--color-ink)]">
                      {formatPrice(due.deposit, currency)}
                    </dd>
                  </div>
                  <div className="flex justify-between gap-4">
                    <dt className="text-[var(--color-muted)]">Outstanding balance</dt>
                    <dd className="font-semibold text-[var(--color-ink)]">
                      {formatPrice(due.balance, currency)}
                    </dd>
                  </div>
                  {(balanceDueDate || balanceNote) && (
                    <p className="border-t border-[var(--color-line)] pt-2 text-[11px] leading-relaxed text-[var(--color-muted)]">
                      {balanceDueDate ? `Balance due by ${balanceDueDate}. ` : ""}
                      {balanceNote ?? ""}
                    </p>
                  )}
                </dl>
              )}

              <div className="flex justify-between items-end gap-4">
                <div>
                  <span className="block font-bold text-slate-900 mb-1">
                    {/* The label has to match what is actually charged: an
                        accommodation-only total, a deposit, or the full stay. */}
                    {quote && quote.unpricedItems.length > 0
                      ? "Accommodation total"
                      : activePlan === "deposit" && due.deposit > 0
                        ? "Deposit due today"
                        : "Total due today"}
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
