// app/components/services/CarRentalCalculator.tsx
// ---------------------------------------------------------------------------
// Car rental planner.
//
// "Pickup date" and "Return date" rather than check-in/check-out, because a
// guest collecting a car is not checking into anything. The chargeable days and
// the total update as soon as either date changes, and the enquiry is prefilled
// with exactly those figures so the guest and the concierge are looking at the
// same number.
// ---------------------------------------------------------------------------

"use client";

import React, { useMemo, useState } from "react";
import { CarFront, MessageCircle, Route } from "lucide-react";
import {
  CAR_RENTAL,
  carRentalDays,
  carRentalTotal,
  formatGhs,
  serviceEnquiryHref,
} from "../../lib/services";
import { addDaysToKey, getMinBookableDateKey, getMaxBookableDateKey } from "../../lib/dates";

const FIELD =
  "w-full rounded-lg border border-[var(--color-line)] bg-white px-3.5 py-3 text-sm text-[var(--color-ink)] outline-none transition-colors focus:border-[var(--color-ink)]";

export default function CarRentalCalculator() {
  const today = getMinBookableDateKey();
  const [pickup, setPickup] = useState("");
  const [dropoff, setDropoff] = useState("");

  const days = carRentalDays(pickup, dropoff);
  const total = carRentalTotal(days);

  const error = useMemo(() => {
    if (pickup && dropoff && dropoff <= pickup) {
      return "The return date must be after the pickup date.";
    }
    return null;
  }, [pickup, dropoff]);

  const href = serviceEnquiryHref("car-rental", { pickup, return: dropoff });

  return (
    <div
      id="car-rental-planner"
      className="mt-8 overflow-hidden rounded-2xl border border-[var(--color-line-soft)] bg-white"
    >
      <div className="flex flex-col gap-6 p-6 md:flex-row md:items-end md:gap-10 md:p-8">
        <div className="min-w-0 flex-1">
          <span className="inline-flex items-center gap-2 rounded-full bg-[var(--color-canvas)] px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.12em] text-[var(--color-ink-soft)]">
            <CarFront size={13} aria-hidden="true" />
            {CAR_RENTAL.vehicle}
          </span>
          <h3 className="mt-3 text-lg font-semibold tracking-tight text-[var(--color-ink)]">
            Plan your rental
          </h3>
          <p className="mt-1 text-sm leading-relaxed text-[var(--color-muted)]">
            {formatGhs(CAR_RENTAL.dayRate)} per day. Choose your dates to see the
            total for the rental period.
          </p>

          <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="rental-pickup" className="eyebrow mb-2 block">
                Pickup date
              </label>
              <input
                id="rental-pickup"
                type="date"
                value={pickup}
                min={today}
                max={getMaxBookableDateKey()}
                onChange={(event) => {
                  const value = event.target.value;
                  setPickup(value);
                  if (dropoff && dropoff <= value) setDropoff("");
                }}
                className={FIELD}
              />
            </div>
            <div>
              <label htmlFor="rental-return" className="eyebrow mb-2 block">
                Return date
              </label>
              <input
                id="rental-return"
                type="date"
                value={dropoff}
                min={pickup ? addDaysToKey(pickup, 1) : addDaysToKey(today, 1)}
                max={getMaxBookableDateKey()}
                onChange={(event) => setDropoff(event.target.value)}
                className={FIELD}
              />
            </div>
          </div>

          {error && (
            <p role="alert" className="mt-3 text-xs font-medium text-red-700">
              {error}
            </p>
          )}
        </div>

        <div className="w-full shrink-0 rounded-xl bg-[var(--color-canvas)] p-5 md:w-64">
          <dl className="space-y-2.5 text-sm">
            <div className="flex items-center justify-between gap-3">
              <dt className="flex items-center gap-1.5 text-[var(--color-muted)]">
                <Route size={13} aria-hidden="true" /> Chargeable days
              </dt>
              <dd className="font-semibold text-[var(--color-ink)]" aria-live="polite">
                {days > 0 ? days : "—"}
              </dd>
            </div>
            <div className="flex items-center justify-between gap-3 border-t border-[var(--color-line)] pt-2.5">
              <dt className="text-[var(--color-muted)]">Rental total</dt>
              <dd className="text-base font-semibold text-[var(--color-ink)]">
                {total > 0 ? formatGhs(total) : "—"}
              </dd>
            </div>
          </dl>

          <a
            href={href}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-4 flex w-full items-center justify-center gap-2 rounded-lg bg-[var(--color-ink)] px-4 py-3 text-sm font-semibold text-white transition-opacity hover:opacity-90"
          >
            <MessageCircle size={15} aria-hidden="true" />
            Enquire with these dates
          </a>
          <p className="mt-2 text-center text-[10px] leading-relaxed text-[var(--color-faint)]">
            Opens WhatsApp with your dates filled in.
          </p>
        </div>
      </div>
    </div>
  );
}
