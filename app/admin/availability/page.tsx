// app/admin/availability/page.tsx
// ---------------------------------------------------------------------------
// Admin: close off date ranges for a property.
//
// Blocking is per-property. Blocked ranges are merged with existing bookings
// on the guest-facing calendar, so a blocked range can never be booked.
// ---------------------------------------------------------------------------

"use client";

import React, { useEffect, useMemo, useState } from "react";
import { createClient } from "../../utils/supabase";
import {
  CalendarOff,
  Loader2,
  Plus,
  Trash2,
  AlertTriangle,
  CalendarCheck,
  Building2,
} from "lucide-react";
import {
  createBlockedRange,
  deleteBlockedRange,
  useVillaAvailability,
} from "../../lib/availability";
import {
  getMaxBookableDateKey,
  getMinBookableDateKey,
  nightsBetween,
  toDateKey,
  isValidDateKey,
} from "../../lib/dates";

interface VillaOption {
  id: number;
  title: string;
}

export default function ManageAvailability() {
  const [villas, setVillas] = useState<VillaOption[]>([]);
  const [isLoadingVillas, setIsLoadingVillas] = useState(true);
  const [selectedVillaId, setSelectedVillaId] = useState<number | null>(null);

  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [reason, setReason] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [formError, setFormError] = useState("");
  const [notice, setNotice] = useState("");

  const availability = useVillaAvailability(selectedVillaId);

  const minKey = getMinBookableDateKey();
  const maxKey = getMaxBookableDateKey();

  // --- Load properties ----------------------------------------------------
  useEffect(() => {
    const load = async () => {
      const supabase = createClient();
      const { data, error } = await supabase
        .from("villas")
        .select("id, title")
        .order("id", { ascending: false });

      if (!error && data) {
        setVillas(data as unknown as VillaOption[]);
        if (data.length > 0) setSelectedVillaId((data[0] as VillaOption).id);
      }
      setIsLoadingVillas(false);
    };
    load();
  }, []);

  // Default the range inputs to today → tomorrow.
  useEffect(() => {
    if (!startDate) {
      const today = new Date();
      const tomorrow = new Date(today.getTime());
      tomorrow.setDate(tomorrow.getDate() + 1);
      setStartDate(toDateKey(today));
      setEndDate(toDateKey(tomorrow));
    }
  }, [startDate]);

  const selectedVilla = useMemo(
    () => villas.find((v) => v.id === selectedVillaId) ?? null,
    [villas, selectedVillaId],
  );

  const blockedRanges = useMemo(
    () =>
      [...availability.blocked].sort((a, b) => (a.start < b.start ? -1 : 1)),
    [availability.blocked],
  );

  const bookedRanges = useMemo(
    () => [...availability.booked].sort((a, b) => (a.start < b.start ? -1 : 1)),
    [availability.booked],
  );

  // --- Create a blockout --------------------------------------------------
  const handleBlock = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError("");
    setNotice("");

    if (selectedVillaId === null) {
      setFormError("Select a property first.");
      return;
    }
    if (!isValidDateKey(startDate) || !isValidDateKey(endDate)) {
      setFormError("Both a start and an end date are required.");
      return;
    }
    if (endDate < startDate) {
      setFormError("The end date cannot be before the start date.");
      return;
    }
    if (startDate < minKey) {
      setFormError("You cannot block dates that are already in the past.");
      return;
    }
    if (endDate > maxKey) {
      setFormError(`Blocked ranges must fall within the booking window (to ${maxKey}).`);
      return;
    }

    setIsSaving(true);
    try {
      await createBlockedRange({
        villa_id: selectedVillaId,
        start_date: startDate,
        end_date: endDate,
        reason,
      });
      const nights = nightsBetween(startDate, endDate) || 1;
      setNotice(
        `Blocked ${startDate} → ${endDate} (${nights} night${nights === 1 ? "" : "s"}) for ${selectedVilla?.title ?? "property"}.`,
      );
      setReason("");
      availability.refresh();
    } catch (error) {
      setFormError(
        error instanceof Error
          ? error.message
          : "Could not save the blockout.",
      );
    } finally {
      setIsSaving(false);
    }
  };

  // --- Remove a blockout --------------------------------------------------
  const handleDelete = async (id: string | number | undefined) => {
    if (id === undefined) return;
    if (!confirm("Remove this blocked range? The dates become bookable again.")) {
      return;
    }
    try {
      await deleteBlockedRange(id);
      setNotice("Blocked range removed.");
      availability.refresh();
    } catch (error) {
      alert(error instanceof Error ? error.message : "Delete failed.");
    }
  };

  return (
    <div className="max-w-6xl mx-auto animate-in fade-in duration-500">
      <header className="mb-10">
        <h1 className="text-3xl font-serif text-slate-900 mb-2">
          Manage Availability
        </h1>
        <p className="text-slate-500 text-sm leading-relaxed">
          Block specific dates or date ranges so guests cannot book them. Blocked
          dates are combined with existing bookings on the booking calendar.
        </p>
      </header>

      {/* Migration hint — shown only when blocked_dates cannot be read */}
      {availability.error && (
        <div className="mb-8 flex items-start gap-3 bg-amber-50 border border-amber-200 text-amber-800 rounded-2xl p-5 text-sm leading-relaxed">
          <AlertTriangle size={20} className="mt-0.5 shrink-0" />
          <div>
            <p className="font-bold mb-1">Blockouts are not persisted yet.</p>
            <p>
              The <code className="font-mono text-xs">blocked_dates</code> table
              could not be read (<span className="font-mono text-xs">{availability.error}</span>).
              Run <span className="font-mono text-xs">supabase/schema.sql</span> in
              your Supabase SQL editor to create it.
            </p>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* ---------------- Blockout form ---------------- */}
        <div className="lg:col-span-5 bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
          <h2 className="font-serif text-lg text-slate-900 pb-4 mb-6 border-b border-slate-100 flex items-center gap-2">
            <CalendarOff size={18} className="text-slate-500" /> Block Dates
          </h2>

          {/* Property picker */}
          <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
            Property
          </label>
          {isLoadingVillas ? (
            <div className="flex items-center gap-2 text-slate-400 text-sm py-3">
              <Loader2 className="animate-spin" size={16} /> Loading properties…
            </div>
          ) : villas.length === 0 ? (
            <p className="text-sm text-slate-500 bg-slate-50 border border-slate-200 rounded-xl p-4">
              No properties found. Add a villa under{" "}
              <span className="font-semibold">Manage Villas</span> first.
            </p>
          ) : (
            <div className="relative mb-6">
              <Building2
                className="absolute left-4 top-3.5 text-slate-400 pointer-events-none"
                size={16}
              />
              <select
                value={selectedVillaId ?? ""}
                onChange={(e) => {
                  setSelectedVillaId(Number(e.target.value));
                  setNotice("");
                }}
                className="w-full appearance-none border border-slate-200 rounded-xl pl-11 pr-4 py-3 text-sm bg-white focus:outline-none focus:border-slate-900 transition-colors"
              >
                {villas.map((villa) => (
                  <option key={villa.id} value={villa.id}>
                    {villa.title}
                  </option>
                ))}
              </select>
            </div>
          )}

          <form onSubmit={handleBlock} className="space-y-5">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
                  From
                </label>
                <input
                  type="date"
                  required
                  min={minKey}
                  max={maxKey}
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="w-full border border-slate-200 rounded-xl px-3 py-3 text-sm focus:outline-none focus:border-slate-900 transition-colors"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
                  To
                </label>
                <input
                  type="date"
                  required
                  min={startDate || minKey}
                  max={maxKey}
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="w-full border border-slate-200 rounded-xl px-3 py-3 text-sm focus:outline-none focus:border-slate-900 transition-colors"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
                Reason <span className="font-normal normal-case">(optional)</span>
              </label>
              <input
                type="text"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="e.g. Maintenance, owner stay"
                className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-slate-900 transition-colors"
              />
            </div>

            {formError && (
              <p className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-xl p-3">
                {formError}
              </p>
            )}
            {notice && (
              <p className="text-sm text-green-700 bg-green-50 border border-green-100 rounded-xl p-3">
                {notice}
              </p>
            )}

            <button
              type="submit"
              disabled={isSaving || selectedVillaId === null}
              className="w-full bg-slate-900 hover:bg-slate-800 text-white font-bold py-3.5 rounded-xl text-sm shadow-md transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSaving ? (
                <>
                  <Loader2 className="animate-spin" size={16} /> Saving…
                </>
              ) : (
                <>
                  <Plus size={16} /> Block These Dates
                </>
              )}
            </button>
          </form>
        </div>

        {/* ---------------- Existing ranges ---------------- */}
        <div className="lg:col-span-7 space-y-6">
          {/* Blocked */}
          <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
            <div className="p-6 border-b border-slate-100 flex items-center justify-between">
              <h2 className="font-serif text-lg text-slate-900 flex items-center gap-2">
                <CalendarOff size={18} className="text-amber-500" /> Blocked Ranges
              </h2>
              <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">
                {blockedRanges.length}
              </span>
            </div>

            {availability.isLoading ? (
              <div className="p-10 flex justify-center">
                <Loader2 className="animate-spin text-slate-300" size={28} />
              </div>
            ) : blockedRanges.length === 0 ? (
              <p className="p-8 text-center text-slate-400 text-sm">
                No blocked dates for this property.
              </p>
            ) : (
              <ul className="divide-y divide-slate-100">
                {blockedRanges.map((range, index) => (
                  <li
                    key={range.id ?? `${range.start}-${index}`}
                    className="p-4 px-6 flex items-center justify-between gap-4 hover:bg-slate-50/60 transition-colors"
                  >
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-slate-900">
                        {range.start}
                        {range.end !== range.start ? ` → ${range.end}` : ""}
                      </p>
                      <p className="text-xs text-slate-500 truncate">
                        {range.reason || "No reason given"}
                      </p>
                    </div>
                    <button
                      onClick={() => handleDelete(range.id)}
                      className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors shrink-0"
                      title="Remove blockout"
                      aria-label={`Remove blockout ${range.start}`}
                    >
                      <Trash2 size={17} />
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {/* Booked (read-only) */}
          <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
            <div className="p-6 border-b border-slate-100 flex items-center justify-between">
              <h2 className="font-serif text-lg text-slate-900 flex items-center gap-2">
                <CalendarCheck size={18} className="text-green-500" /> Reserved by
                Guests
              </h2>
              <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">
                {bookedRanges.length}
              </span>
            </div>
            {bookedRanges.length === 0 ? (
              <p className="p-8 text-center text-slate-400 text-sm">
                No guest reservations for this property yet.
              </p>
            ) : (
              <ul className="divide-y divide-slate-100">
                {bookedRanges.map((range, index) => (
                  <li
                    key={`${range.start}-${index}`}
                    className="p-4 px-6 flex items-center justify-between"
                  >
                    <span className="text-sm font-semibold text-slate-900">
                      {range.start}
                      {range.end !== range.start ? ` → ${range.end}` : ""}
                    </span>
                    <span className="text-[10px] font-bold uppercase tracking-widest text-green-600 bg-green-50 px-2 py-1 rounded-md">
                      Booked
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
