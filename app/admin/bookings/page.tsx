// app/admin/bookings/page.tsx
"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import { createClient, isSupabaseConfigured } from "../../utils/supabase";
import {
  Loader2,
  CheckCircle,
  XCircle,
  Clock,
  ShieldCheck,
  Search,
  X,
  ChevronLeft,
  ChevronRight,
  AlertTriangle,
} from "lucide-react";

interface Booking {
  id: string;
  guest_name: string;
  guest_email: string;
  guest_phone: string;
  check_in_date: string;
  /** Present once supabase/schema.sql has been applied. */
  check_out_date?: string | null;
  nights?: number | null;
  total_amount: number;
  currency?: string | null;
  status: "pending" | "confirmed" | "cancelled";
  payment_status?: string | null;
  payment_reference?: string | null;
  created_at: string;
  villas: {
    title: string;
  } | null;
}

interface VillaOption {
  id: number;
  title: string;
}

const PAGE_SIZE = 15;

const EMPTY_FILTERS = {
  search: "",
  status: "all",
  villaId: "all",
  from: "",
  to: "",
};

type Filters = typeof EMPTY_FILTERS;

export default function ManageBookings() {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [villas, setVillas] = useState<VillaOption[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [page, setPage] = useState(0);

  const [filters, setFilters] = useState<Filters>(EMPTY_FILTERS);
  /** The debounced value actually sent to the database. */
  const [searchTerm, setSearchTerm] = useState("");

  // Villa list for the property filter.
  useEffect(() => {
    if (!isSupabaseConfigured()) return;
    let cancelled = false;
    createClient()
      .from("villas")
      .select("id, title")
      .order("title")
      .then(({ data }) => {
        if (!cancelled && data) setVillas(data as VillaOption[]);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  // Debounce the free-text box so every keystroke is not a round trip.
  useEffect(() => {
    const timer = setTimeout(() => setSearchTerm(filters.search.trim()), 300);
    return () => clearTimeout(timer);
  }, [filters.search]);

  // Any change to the criteria invalidates the current page number.
  useEffect(() => {
    setPage(0);
  }, [searchTerm, filters.status, filters.villaId, filters.from, filters.to]);

  const fetchBookings = useCallback(async () => {
    if (!isSupabaseConfigured()) {
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError("");

    const supabase = createClient();
    const from = page * PAGE_SIZE;
    const to = from + PAGE_SIZE - 1;

    let query = supabase
      .from("bookings")
      .select("*, villas(title)", { count: "exact" });

    if (filters.status !== "all") query = query.eq("status", filters.status);
    if (filters.villaId !== "all")
      query = query.eq("villa_id", Number(filters.villaId));
    if (filters.from) query = query.gte("check_in_date", filters.from);
    if (filters.to) query = query.lte("check_in_date", filters.to);

    if (searchTerm) {
      // Commas and parentheses would break PostgREST's `or` grammar, so strip
      // them rather than let the filter silently misbehave.
      const safe = searchTerm.replace(/[,()]/g, " ").trim();
      if (safe) {
        query = query.or(
          `guest_name.ilike.%${safe}%,guest_email.ilike.%${safe}%,guest_phone.ilike.%${safe}%`,
        );
      }
    }

    const { data, error: queryError, count } = await query
      .order("created_at", { ascending: false })
      .range(from, to);

    if (queryError) {
      setError(queryError.message);
      setBookings([]);
      setTotalCount(0);
    } else {
      setBookings((data ?? []) as unknown as Booking[]);
      setTotalCount(count ?? 0);
    }
    setIsLoading(false);
  }, [
    page,
    searchTerm,
    filters.status,
    filters.villaId,
    filters.from,
    filters.to,
  ]);

  useEffect(() => {
    fetchBookings();
  }, [fetchBookings]);

  const updateStatus = async (id: string, newStatus: string) => {
    if (newStatus === "cancelled") {
      const confirmed = confirm(
        "Cancel this booking?\n\nThe dates are released and become bookable " +
          "again. Any refund has to be arranged separately in Paystack.",
      );
      if (!confirmed) return;
    }

    const supabase = createClient();
    const { error: updateError } = await supabase
      .from("bookings")
      .update({ status: newStatus })
      .eq("id", id);

    if (updateError) {
      alert("Error updating booking: " + updateError.message);
      return;
    }

    // Releasing the hold means removing the blockout the payment created.
    // Without this the block would keep the dates closed even though the
    // booking is cancelled.
    if (newStatus === "cancelled") {
      const { error: unblockError } = await supabase
        .from("blocked_dates")
        .delete()
        .eq("booking_id", id);
      if (unblockError) {
        console.warn(
          "[bookings] cancelled but could not release the blocked dates:",
          unblockError.message,
        );
      }
    }

    fetchBookings();
  };

  const renderStatus = (status: string) => {
    switch (status) {
      case "confirmed":
        return (
          <span className="flex w-fit items-center gap-1 rounded-md bg-green-50 px-2 py-1 text-xs font-semibold text-green-700">
            <CheckCircle size={14} /> Confirmed
          </span>
        );
      case "cancelled":
        return (
          <span className="flex w-fit items-center gap-1 rounded-md bg-red-50 px-2 py-1 text-xs font-semibold text-red-700">
            <XCircle size={14} /> Cancelled
          </span>
        );
      default:
        return (
          <span className="flex w-fit items-center gap-1 rounded-md bg-amber-50 px-2 py-1 text-xs font-semibold text-amber-700">
            <Clock size={14} /> Pending
          </span>
        );
    }
  };

  const hasFilters = useMemo(
    () => JSON.stringify(filters) !== JSON.stringify(EMPTY_FILTERS),
    [filters],
  );

  const pageCount = Math.max(1, Math.ceil(totalCount / PAGE_SIZE));
  const firstRow = totalCount === 0 ? 0 : page * PAGE_SIZE + 1;
  const lastRow = Math.min((page + 1) * PAGE_SIZE, totalCount);

  const set = <K extends keyof Filters>(key: K, value: Filters[K]) =>
    setFilters((prev) => ({ ...prev, [key]: value }));

  const inputClass =
    "w-full rounded-lg border border-[var(--color-line)] bg-white px-3 py-2.5 text-sm text-[var(--color-ink)] outline-none transition-colors placeholder:text-[var(--color-faint)] focus:border-[var(--color-ink)]";

  return (
    <div className="mx-auto max-w-6xl animate-in fade-in duration-500">
      <div className="mb-8">
        <h1 className="mb-2 text-2xl font-semibold tracking-tight text-[var(--color-ink)]">
          Manage Bookings
        </h1>
        <p className="text-sm text-slate-500">
          Review incoming reservations and update their status.
        </p>
      </div>

      {!isSupabaseConfigured() && (
        <div className="mb-6 flex gap-3 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
          <AlertTriangle size={18} className="mt-0.5 shrink-0" />
          <p>
            Supabase is not configured, so bookings cannot be loaded. Add your
            keys to <code className="font-mono text-xs">.env.local</code> and
            rebuild.
          </p>
        </div>
      )}

      {/* ------------------------------- Filters ------------------------------ */}
      <div className="mb-5 rounded-2xl border border-[var(--color-line-soft)] bg-white p-4 shadow-[var(--shadow-raise)]">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          <div className="lg:col-span-2">
            <label className="eyebrow mb-1.5 block">Search guest</label>
            <div className="relative">
              <Search
                size={15}
                className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[var(--color-faint)]"
              />
              <input
                type="text"
                value={filters.search}
                onChange={(e) => set("search", e.target.value)}
                placeholder="Name, email or phone"
                className={`${inputClass} pl-9`}
              />
            </div>
          </div>

          <div>
            <label className="eyebrow mb-1.5 block">Status</label>
            <select
              value={filters.status}
              onChange={(e) => set("status", e.target.value)}
              className={inputClass}
            >
              <option value="all">All statuses</option>
              <option value="pending">Pending</option>
              <option value="confirmed">Confirmed</option>
              <option value="cancelled">Cancelled</option>
            </select>
          </div>

          <div>
            <label className="eyebrow mb-1.5 block">Property</label>
            <select
              value={filters.villaId}
              onChange={(e) => set("villaId", e.target.value)}
              className={inputClass}
            >
              <option value="all">All properties</option>
              {villas.map((v) => (
                <option key={v.id} value={v.id}>
                  {v.title}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="eyebrow mb-1.5 block">Check-in from</label>
            <input
              type="date"
              value={filters.from}
              onChange={(e) => set("from", e.target.value)}
              className={inputClass}
            />
          </div>

          <div>
            <label className="eyebrow mb-1.5 block">Check-in to</label>
            <input
              type="date"
              value={filters.to}
              onChange={(e) => set("to", e.target.value)}
              className={inputClass}
            />
          </div>
        </div>

        {hasFilters && (
          <button
            onClick={() => setFilters(EMPTY_FILTERS)}
            className="mt-3 inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold text-[var(--color-muted)] transition-colors hover:bg-[var(--color-canvas)] hover:text-[var(--color-ink)]"
          >
            <X size={13} /> Clear filters
          </button>
        )}
      </div>

      {error && (
        <div className="mb-5 flex gap-3 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800">
          <AlertTriangle size={18} className="mt-0.5 shrink-0" />
          <div>
            <p className="font-semibold">Could not load bookings.</p>
            <p className="mt-0.5 break-words opacity-90">{error}</p>
          </div>
        </div>
      )}

      {/* -------------------------------- Table ------------------------------- */}
      <div className="overflow-hidden rounded-2xl border border-[var(--color-line-soft)] bg-white shadow-[var(--shadow-raise)]">
        {isLoading ? (
          <div className="flex items-center justify-center py-24">
            <Loader2 className="animate-spin text-[var(--color-muted)]" size={32} />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[900px] border-collapse text-left">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50 text-xs font-semibold uppercase tracking-wider text-slate-400">
                  <th className="px-6 py-4">Guest Details</th>
                  <th className="px-6 py-4">Property</th>
                  <th className="px-6 py-4">Stay</th>
                  <th className="px-6 py-4">Amount</th>
                  <th className="px-6 py-4">Payment</th>
                  <th className="px-6 py-4">Status</th>
                  <th className="px-6 py-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-sm text-slate-700">
                {bookings.map((booking) => (
                  <tr key={booking.id} className="transition-colors hover:bg-slate-50/50">
                    <td className="px-6 py-4">
                      <p className="font-semibold text-slate-900">
                        {booking.guest_name}
                      </p>
                      <p className="text-xs text-slate-500">{booking.guest_email}</p>
                      <p className="text-xs text-slate-500">{booking.guest_phone}</p>
                    </td>
                    <td className="px-6 py-4 font-medium text-slate-900">
                      {booking.villas?.title || "Unknown Villa"}
                    </td>
                    <td className="whitespace-nowrap px-6 py-4 text-slate-500">
                      {new Date(booking.check_in_date).toLocaleDateString()}
                      {booking.check_out_date && (
                        <span className="block text-xs text-slate-400">
                          out {new Date(booking.check_out_date).toLocaleDateString()}
                          {booking.nights ? ` · ${booking.nights}n` : ""}
                        </span>
                      )}
                    </td>
                    <td className="whitespace-nowrap px-6 py-4 font-semibold text-slate-900">
                      {booking.currency ?? "GHS"} {booking.total_amount}
                    </td>
                    <td className="px-6 py-4">
                      {booking.payment_status === "paid" ? (
                        <span className="flex w-fit items-center gap-1 whitespace-nowrap rounded-md bg-emerald-50 px-2 py-1 text-xs font-semibold text-emerald-700">
                          <ShieldCheck size={14} /> Paid
                        </span>
                      ) : (
                        <span className="w-fit whitespace-nowrap rounded-md bg-slate-100 px-2 py-1 text-xs font-semibold text-slate-500">
                          Unpaid
                        </span>
                      )}
                      {booking.payment_reference && (
                        <span className="mt-1 block max-w-[160px] break-all font-mono text-[10px] text-slate-400">
                          {booking.payment_reference}
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4">{renderStatus(booking.status)}</td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex justify-end gap-2">
                        {booking.status !== "confirmed" && (
                          <button
                            onClick={() => updateStatus(booking.id, "confirmed")}
                            className="rounded-lg bg-green-100 px-3 py-1.5 text-xs font-semibold text-green-700 transition-colors hover:bg-green-200"
                          >
                            Confirm
                          </button>
                        )}
                        {booking.status !== "cancelled" && (
                          <button
                            onClick={() => updateStatus(booking.id, "cancelled")}
                            className="rounded-lg bg-red-100 px-3 py-1.5 text-xs font-semibold text-red-700 transition-colors hover:bg-red-200"
                          >
                            Cancel
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
                {bookings.length === 0 && (
                  <tr>
                    <td colSpan={7} className="py-16 text-center text-slate-400">
                      {hasFilters ? (
                        <>
                          No bookings match these filters.
                          <button
                            onClick={() => setFilters(EMPTY_FILTERS)}
                            className="ml-1 font-semibold text-[var(--color-accent)] underline"
                          >
                            Clear them
                          </button>
                        </>
                      ) : (
                        "No bookings yet. They will appear here once customers start checking out."
                      )}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ------------------------------ Pagination ---------------------------- */}
      {!isLoading && totalCount > 0 && (
        <div className="mt-5 flex flex-col items-center justify-between gap-4 sm:flex-row">
          <p className="text-xs text-[var(--color-muted)]">
            Showing <strong className="text-[var(--color-ink)]">{firstRow}</strong>
            –<strong className="text-[var(--color-ink)]">{lastRow}</strong> of{" "}
            <strong className="text-[var(--color-ink)]">{totalCount}</strong>{" "}
            {totalCount === 1 ? "booking" : "bookings"}
          </p>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setPage((p) => Math.max(0, p - 1))}
              disabled={page === 0}
              className="inline-flex items-center gap-1 rounded-lg border border-[var(--color-line)] px-3 py-1.5 text-xs font-semibold text-[var(--color-ink)] transition-colors hover:bg-[var(--color-canvas)] disabled:cursor-not-allowed disabled:opacity-40"
            >
              <ChevronLeft size={14} /> Previous
            </button>

            <span className="px-1 text-xs text-[var(--color-muted)]">
              Page {page + 1} of {pageCount}
            </span>

            <button
              onClick={() => setPage((p) => Math.min(pageCount - 1, p + 1))}
              disabled={page >= pageCount - 1}
              className="inline-flex items-center gap-1 rounded-lg border border-[var(--color-line)] px-3 py-1.5 text-xs font-semibold text-[var(--color-ink)] transition-colors hover:bg-[var(--color-canvas)] disabled:cursor-not-allowed disabled:opacity-40"
            >
              Next <ChevronRight size={14} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
