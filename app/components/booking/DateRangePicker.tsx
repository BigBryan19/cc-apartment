// app/components/booking/DateRangePicker.tsx
// ---------------------------------------------------------------------------
// Availability-aware calendar for picking a check-in / check-out pair.
//
// A native <input type="date"> can only express a min/max window — it cannot
// grey out arbitrary dates. This component renders its own month grid so the
// guest can see exactly which nights are unavailable, and it refuses to build
// a stay that would span a booked or admin-blocked range.
// ---------------------------------------------------------------------------

"use client";

import React, { useMemo, useState } from "react";
import { ChevronLeft, ChevronRight, Info } from "lucide-react";
import {
  addDays,
  buildUnavailableSet,
  expandRange,
  fromDateKey,
  getMaxBookableDateKey,
  getMinBookableDateKey,
  nightsBetween,
  toDateKey,
  type DateRange,
} from "../../lib/dates";

const WEEKDAYS = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];
const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

interface DateRangePickerProps {
  checkIn: string;
  checkOut: string;
  onChange: (checkIn: string, checkOut: string) => void;
  /** Merged blocked + booked ranges to grey out. */
  unavailableRanges?: DateRange[];
  /** Override the window (defaults to today → end of next year). */
  minKey?: string;
  maxKey?: string;
  /** Optional message to surface under the grid. */
  message?: string;
  className?: string;
}

export default function DateRangePicker({
  checkIn,
  checkOut,
  onChange,
  unavailableRanges = [],
  minKey,
  maxKey,
  message,
  className = "",
}: DateRangePickerProps) {
  const effectiveMin = minKey || getMinBookableDateKey();
  const effectiveMax = maxKey || getMaxBookableDateKey();

  const today = new Date();
  const [viewDate, setViewDate] = useState<Date>(
    () => new Date(today.getFullYear(), today.getMonth(), 1),
  );
  const [hoverKey, setHoverKey] = useState<string>("");
  const [hint, setHint] = useState<string>("");

  // Day-key -> reason, for tooltips and legend counts.
  const reasonByKey = useMemo(() => {
    const map = new Map<string, string>();
    for (const range of unavailableRanges) {
      const label =
        range.reason ||
        (range.kind === "booked" ? "Already booked" : "Unavailable");
      for (const key of expandRange(range)) {
        if (!map.has(key)) map.set(key, label);
      }
    }
    return map;
  }, [unavailableRanges]);

  const unavailableSet = useMemo(
    () => buildUnavailableSet(unavailableRanges),
    [unavailableRanges],
  );

  const minMonth = fromDateKey(effectiveMin);
  const maxMonth = fromDateKey(effectiveMax);
  const canGoBack =
    viewDate.getFullYear() > minMonth.getFullYear() ||
    (viewDate.getFullYear() === minMonth.getFullYear() &&
      viewDate.getMonth() > minMonth.getMonth());
  const canGoForward =
    viewDate.getFullYear() < maxMonth.getFullYear() ||
    (viewDate.getFullYear() === maxMonth.getFullYear() &&
      viewDate.getMonth() < maxMonth.getMonth());

  const shiftMonth = (delta: number) =>
    setViewDate(
      (prev) => new Date(prev.getFullYear(), prev.getMonth() + delta, 1),
    );

  /** Which day cells the calendar should build for the visible month. */
  const cells = useMemo(() => {
    const year = viewDate.getFullYear();
    const month = viewDate.getMonth();
    const firstWeekday = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();

    const out: Array<{ key: string; day: number } | null> = [];
    for (let i = 0; i < firstWeekday; i += 1) out.push(null);
    for (let day = 1; day <= daysInMonth; day += 1) {
      out.push({ key: toDateKey(new Date(year, month, day)), day });
    }
    return out;
  }, [viewDate]);

  const isPastOrOutOfWindow = (key: string) =>
    key < effectiveMin || key > effectiveMax;

  const isHardDisabled = (key: string) =>
    isPastOrOutOfWindow(key) || unavailableSet.has(key);

  /**
   * For the second click we need a different question: is the *stay* from
   * checkIn to this day free? A check-out day itself may be the next guest's
   * check-in day, so only nights [checkIn, key) must be clear.
   */
  const stayWouldConflict = (key: string): boolean => {
    if (!checkIn || key <= checkIn) return false;
    const nights = nightsBetween(checkIn, key);
    let cursor = fromDateKey(checkIn);
    for (let i = 0; i < nights; i += 1) {
      if (unavailableSet.has(toDateKey(cursor))) return true;
      cursor = addDays(cursor, 1);
    }
    return false;
  };

  const handleDayClick = (key: string) => {
    setHint("");
    if (isHardDisabled(key)) return;

    // Starting a fresh selection.
    if (!checkIn || checkOut || key <= checkIn) {
      onChange(key, "");
      return;
    }

    if (stayWouldConflict(key)) {
      setHint(
        "Those dates overlap an unavailable night, so a new check-in was started here.",
      );
      onChange(key, "");
      return;
    }

    onChange(checkIn, key);
  };

  const totalNights = nightsBetween(checkIn, checkOut);

  // Hover preview extends the highlight to the cursor while choosing check-out.
  const previewEnd = checkIn && !checkOut && hoverKey > checkIn ? hoverKey : "";
  const rangeEnd = checkOut || previewEnd;

  const dayClass = (key: string) => {
    const disabled = isHardDisabled(key);
    const isStart = key === checkIn;
    const isEnd = key === checkOut;
    const isEndPreview = !checkOut && key === previewEnd;
    const inRange =
      !!checkIn &&
      !!rangeEnd &&
      key > checkIn &&
      key < rangeEnd &&
      !disabled;

    if (isStart || isEnd) {
      return "bg-slate-900 text-white font-bold shadow-md";
    }
    if (isEndPreview) {
      return "bg-slate-200 text-slate-900 font-semibold ring-1 ring-slate-400";
    }
    if (inRange) {
      return "bg-blue-50 text-slate-900 font-medium";
    }
    if (disabled) {
      return "text-slate-300 cursor-not-allowed line-through decoration-slate-300 bg-slate-50";
    }
    return "text-slate-700 hover:bg-slate-100 hover:text-slate-900 font-medium";
  };

  return (
    <div className={className}>
      {/* Month header */}
      <div className="flex items-center justify-between mb-3">
        <button
          type="button"
          onClick={() => shiftMonth(-1)}
          disabled={!canGoBack}
          aria-label="Previous month"
          className="p-1.5 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-100 disabled:opacity-30 disabled:cursor-not-allowed transition"
        >
          <ChevronLeft size={16} />
        </button>
        <span className="text-sm font-bold text-slate-900 tracking-wide">
          {MONTH_NAMES[viewDate.getMonth()]} {viewDate.getFullYear()}
        </span>
        <button
          type="button"
          onClick={() => shiftMonth(1)}
          disabled={!canGoForward}
          aria-label="Next month"
          className="p-1.5 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-100 disabled:opacity-30 disabled:cursor-not-allowed transition"
        >
          <ChevronRight size={16} />
        </button>
      </div>

      {/* Weekday header */}
      <div className="grid grid-cols-7 gap-1 mb-1">
        {WEEKDAYS.map((d) => (
          <div
            key={d}
            className="text-center text-[10px] font-bold uppercase tracking-wider text-slate-400 py-1"
          >
            {d}
          </div>
        ))}
      </div>

      {/* Day grid */}
      <div className="grid grid-cols-7 gap-1">
        {cells.map((cell, index) =>
          cell === null ? (
            <div key={`blank-${index}`} aria-hidden="true" />
          ) : (
            <button
              key={cell.key}
              type="button"
              onClick={() => handleDayClick(cell.key)}
              onMouseEnter={() => setHoverKey(cell.key)}
              onMouseLeave={() => setHoverKey("")}
              disabled={isHardDisabled(cell.key)}
              aria-label={
                reasonByKey.get(cell.key)
                  ? `${cell.key} — ${reasonByKey.get(cell.key)}`
                  : cell.key
              }
              title={reasonByKey.get(cell.key)}
              className={`aspect-square rounded-lg text-xs transition-colors ${dayClass(cell.key)}`}
            >
              {cell.day}
            </button>
          ),
        )}
      </div>

      {/* Selection summary */}
      <div className="mt-3 flex items-center justify-between text-xs">
        <span className="text-slate-500 font-medium">
          {checkIn && checkOut
            ? `${checkIn} → ${checkOut} · ${totalNights} night${totalNights === 1 ? "" : "s"}`
            : checkIn
              ? `Check-in ${checkIn} — now pick a check-out`
              : "Select your check-in date"}
        </span>
        {checkIn || checkOut ? (
          <button
            type="button"
            onClick={() => {
              onChange("", "");
              setHint("");
            }}
            className="text-slate-400 hover:text-slate-700 font-bold uppercase tracking-wider text-[10px]"
          >
            Clear
          </button>
        ) : null}
      </div>

      {/* Legend */}
      <div className="mt-3 pt-3 border-t border-slate-100 flex flex-wrap items-center gap-x-4 gap-y-2 text-[10px] text-slate-500 font-medium">
        <span className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded bg-white border border-slate-300" />
          Available
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded bg-slate-900" />
          Selected
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded bg-slate-50 border border-slate-200" />
          Booked / blocked
        </span>
      </div>

      {(hint || message) && (
        <p className="mt-3 flex items-start gap-2 text-[11px] text-amber-700 bg-amber-50 border border-amber-100 rounded-lg p-2 leading-relaxed">
          <Info size={13} className="mt-0.5 shrink-0" />
          <span>{hint || message}</span>
        </p>
      )}
    </div>
  );
}
