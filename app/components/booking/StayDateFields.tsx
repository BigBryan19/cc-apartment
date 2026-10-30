// app/components/booking/StayDateFields.tsx
// ---------------------------------------------------------------------------
// Two explicitly labelled date fields: "Select check-in date" and
// "Select check-out date".
//
// WHY NOT A SINGLE CALENDAR
//
//   The booking widget previously showed one calendar whose only instruction was
//   "Select your check-in date" — the same words appeared whether the guest was
//   choosing the first date or the second, and the screenshot in the brief shows
//   the check-in label repeated where check-out belonged. Two labelled fields
//   make the sequence unambiguous on every device, including phones where the
//   native date picker covers the calendar.
//
// AVAILABILITY IS STILL ENFORCED
//
//   The optional calendar below the fields is the same availability-aware grid
//   used before, so blocked and booked nights stay visible, and `validateStay`
//   is applied to whatever the fields contain — a typed date cannot slip past
//   a booked night.
// ---------------------------------------------------------------------------

"use client";

import React, { useMemo, useState } from "react";
import { CalendarDays, ChevronDown, Info } from "lucide-react";
import DateRangePicker from "./DateRangePicker";
import {
  addDaysToKey,
  getMaxBookableDateKey,
  getMinBookableDateKey,
  nightsBetween,
  validateStay,
  type DateRange,
} from "../../lib/dates";

interface StayDateFieldsProps {
  checkIn: string;
  checkOut: string;
  onChange: (checkIn: string, checkOut: string) => void;
  /** Blocked + booked ranges for the property. */
  unavailableRanges?: DateRange[];
  /** Extra note under the fields (e.g. "live availability unavailable"). */
  message?: string;
  /** Start with the calendar opened. */
  defaultCalendarOpen?: boolean;
  className?: string;
}

const FIELD =
  "w-full rounded-lg border border-[var(--color-line)] bg-white px-3.5 py-3 text-sm text-[var(--color-ink)] outline-none transition-colors focus:border-[var(--color-ink)]";
const LABEL = "eyebrow mb-2 block";

export default function StayDateFields({
  checkIn,
  checkOut,
  onChange,
  unavailableRanges = [],
  message,
  defaultCalendarOpen = false,
  className = "",
}: StayDateFieldsProps) {
  const [calendarOpen, setCalendarOpen] = useState(defaultCalendarOpen);

  const minKey = getMinBookableDateKey();
  const maxKey = getMaxBookableDateKey();

  const nights = nightsBetween(checkIn, checkOut);

  // Whatever the two fields contain must satisfy the same rules the server
  // applies: inside the window, in order, and free of booked nights.
  const stayError = useMemo(
    () =>
      checkIn && checkOut ? validateStay(checkIn, checkOut, unavailableRanges) : null,
    [checkIn, checkOut, unavailableRanges],
  );

  const checkInBooked = useMemo(
    () =>
      Boolean(checkIn) &&
      unavailableRanges.some(
        (range) => checkIn >= range.start && checkIn < range.end,
      ),
    [checkIn, unavailableRanges],
  );

  const handleCheckIn = (value: string) => {
    if (!value) {
      onChange("", "");
      return;
    }
    // A check-out that is not after the new check-in is no longer valid.
    if (checkOut && checkOut <= value) {
      onChange(value, "");
      return;
    }
    onChange(value, checkOut);
  };

  const handleCheckOut = (value: string) => {
    if (!value) {
      onChange(checkIn, "");
      return;
    }
    onChange(checkIn, value);
  };

  // The earliest legal check-out is the day after check-in.
  const minCheckOut = checkIn ? addDaysToKey(checkIn, 1) : addDaysToKey(minKey, 1);

  return (
    <div className={className}>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="stay-check-in" className={LABEL}>
            Select check-in date
          </label>
          <input
            id="stay-check-in"
            name="checkIn"
            type="date"
            value={checkIn}
            min={minKey}
            max={maxKey}
            onChange={(event) => handleCheckIn(event.target.value)}
            aria-invalid={checkInBooked || undefined}
            className={`${FIELD} ${
              checkInBooked ? "border-red-300 bg-red-50/40" : ""
            }`}
          />
          {checkInBooked && (
            <p role="alert" className="mt-2 text-[11px] font-medium text-red-700">
              That night is already taken. Choose another check-in date.
            </p>
          )}
        </div>

        <div>
          <label htmlFor="stay-check-out" className={LABEL}>
            Select check-out date
          </label>
          <input
            id="stay-check-out"
            name="checkOut"
            type="date"
            value={checkOut}
            min={minCheckOut}
            max={addDaysToKey(maxKey, 1)}
            onChange={(event) => handleCheckOut(event.target.value)}
            className={FIELD}
          />
          {checkIn && !checkOut && (
            <p className="mt-2 text-[11px] text-[var(--color-faint)]">
              Must be after {checkIn}.
            </p>
          )}
        </div>
      </div>

      {/* Nights — recalculated the moment either field changes. */}
      <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
        <span
          className="inline-flex items-center gap-2 rounded-full bg-[var(--color-canvas)] px-3 py-1.5 text-xs font-semibold text-[var(--color-ink-soft)]"
          aria-live="polite"
        >
          <CalendarDays size={13} aria-hidden="true" />
          {nights > 0
            ? `${nights} night${nights === 1 ? "" : "s"}`
            : "Select both dates"}
        </span>

        <button
          type="button"
          onClick={() => setCalendarOpen((open) => !open)}
          aria-expanded={calendarOpen}
          aria-controls="stay-availability-calendar"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-[var(--color-muted)] transition-colors hover:text-[var(--color-ink)]"
        >
          {calendarOpen ? "Hide availability" : "Check availability"}
          <ChevronDown
            size={14}
            className={`transition-transform ${calendarOpen ? "rotate-180" : ""}`}
            aria-hidden="true"
          />
        </button>
      </div>

      {calendarOpen && (
        <div
          id="stay-availability-calendar"
          className="mt-4 rounded-xl border border-[var(--color-line)] p-4"
        >
          <DateRangePicker
            checkIn={checkIn}
            checkOut={checkOut}
            unavailableRanges={unavailableRanges}
            onChange={onChange}
          />
        </div>
      )}

      {(stayError || message) && (
        <p className="mt-3 flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 p-3 text-[11px] leading-relaxed text-amber-900">
          <Info size={13} className="mt-0.5 shrink-0" aria-hidden="true" />
          <span>{stayError || message}</span>
        </p>
      )}
    </div>
  );
}
