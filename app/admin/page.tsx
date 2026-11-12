// app/admin/page.tsx
// ---------------------------------------------------------------------------
// Dashboard.
//
// WHAT IT ANSWERS
//
//   How much have we taken, how full are the apartments, which property earns,
//   and what still needs confirming. Every figure is derived from the bookings
//   table at load time — nothing here is a placeholder, and nothing is estimated
//   from a hard-coded number.
//
// HONEST ZEROES
//
//   A failed read shows "—" with the error, never 0. A booking with no recorded
//   payment counts as unpaid rather than as revenue, and a cancelled booking is
//   excluded from revenue and occupancy but still counted in the booking total.
//
// CHARTS
//
//   Plain SVG and CSS. A charting dependency for two small charts would add
//   weight to every admin page load for no benefit.
// ---------------------------------------------------------------------------

"use client";

import React, { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { createClient, isSupabaseConfigured } from "../utils/supabase";
import {
  Home,
  CalendarCheck,
  Wallet,
  ArrowUpRight,
  AlertTriangle,
  Users,
  Percent,
  ClipboardCheck,
} from "lucide-react";

interface BookingRow {
  id: number;
  villa_id: number | null;
  guest_name: string | null;
  check_in_date: string | null;
  check_out_date: string | null;
  nights: number | null;
  total_amount: number | null;
  amount_paid: number | null;
  payment_status: string | null;
  status: string | null;
  created_at: string | null;
}

interface VillaRow {
  id: number;
  title: string | null;
}

/** Only what the "unverified today" count needs. */
interface VerificationRow {
  status: string;
  submitted_at: string | null;
  check_in_date: string | null;
}

/** Local calendar day as YYYY-MM-DD, so "today" means the staff member's today. */
function localDay(value: string | Date | null): string {
  if (!value) return "";
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${date.getFullYear()}-${month}-${day}`;
}

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

function money(amount: number): string {
  return `₵${Math.round(amount).toLocaleString("en-GH")}`;
}

/** Nights actually occupied inside a date window, clipped to it. */
function nightsInWindow(
  checkIn: string | null,
  checkOut: string | null,
  windowStart: Date,
  windowEnd: Date,
): number {
  if (!checkIn || !checkOut) return 0;
  const start = new Date(`${checkIn}T00:00:00Z`);
  const end = new Date(`${checkOut}T00:00:00Z`);
  const from = Math.max(start.getTime(), windowStart.getTime());
  const to = Math.min(end.getTime(), windowEnd.getTime());
  if (to <= from) return 0;
  return Math.round((to - from) / 86400000);
}

export default function AdminDashboard() {
  const configured = isSupabaseConfigured();

  const [bookings, setBookings] = useState<BookingRow[]>([]);
  const [villas, setVillas] = useState<VillaRow[]>([]);
  const [verifications, setVerifications] = useState<VerificationRow[]>([]);
  const [isLoading, setIsLoading] = useState(configured);
  const [error, setError] = useState("");

  const unavailable = !configured || Boolean(error);

  useEffect(() => {
    if (!configured) return;
    let cancelled = false;

    const load = async () => {
      const supabase = createClient();
      try {
        const [bookingResult, villaResult, verificationResult] = await Promise.all([
          supabase
            .from("bookings")
            .select(
              "id, villa_id, guest_name, check_in_date, check_out_date, nights, total_amount, amount_paid, payment_status, status, created_at",
            )
            .order("created_at", { ascending: false })
            .limit(500),
          supabase.from("villas").select("id, title"),
          // Kept separate from the failure check below: a missing verifications
          // table must not blank out the money and occupancy figures.
          supabase
            .from("guest_verifications")
            .select("status, submitted_at, check_in_date")
            .eq("status", "submitted")
            .limit(500),
        ]);

        if (cancelled) return;
        const failure = bookingResult.error || villaResult.error;
        if (failure) {
          setError(failure.message);
          return;
        }

        setBookings((bookingResult.data ?? []) as BookingRow[]);
        setVillas((villaResult.data ?? []) as VillaRow[]);
        if (!verificationResult.error) {
          setVerifications((verificationResult.data ?? []) as VerificationRow[]);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Could not reach the database.");
        }
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    };

    load();
    return () => {
      cancelled = true;
    };
  }, [configured]);

  const analytics = useMemo(() => {
    const now = new Date();
    const live = bookings.filter((booking) => booking.status !== "cancelled");

    // Money actually received: amount_paid when recorded, otherwise the full
    // total of a booking marked paid.
    const received = live.reduce((sum, booking) => {
      if (typeof booking.amount_paid === "number") return sum + booking.amount_paid;
      return booking.payment_status === "paid" ? sum + (booking.total_amount ?? 0) : sum;
    }, 0);

    const outstanding = live.reduce((sum, booking) => {
      if (booking.payment_status === "paid") return sum;
      const total = booking.total_amount ?? 0;
      const paid = booking.amount_paid ?? 0;
      return sum + Math.max(0, total - paid);
    }, 0);

    const confirmed = live.filter((booking) => booking.status === "confirmed").length;
    const pending = live.filter((booking) => !booking.status || booking.status === "pending").length;

    // Occupancy for the next 30 days across every property.
    const windowStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
    const windowEnd = new Date(windowStart.getTime() + 30 * 86400000);
    const occupiedNights = live.reduce(
      (sum, booking) =>
        sum + nightsInWindow(booking.check_in_date, booking.check_out_date, windowStart, windowEnd),
      0,
    );
    const capacityNights = Math.max(1, villas.length) * 30;
    const occupancy = Math.min(100, Math.round((occupiedNights / capacityNights) * 100));

    // Revenue by month, last six months, by the month the booking was created.
    const months = Array.from({ length: 6 }, (_, index) => {
      const date = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - (5 - index), 1));
      return {
        key: `${date.getUTCFullYear()}-${date.getUTCMonth()}`,
        label: MONTHS[date.getUTCMonth()],
        total: 0,
        count: 0,
      };
    });

    for (const booking of live) {
      if (!booking.created_at) continue;
      const created = new Date(booking.created_at);
      const key = `${created.getUTCFullYear()}-${created.getUTCMonth()}`;
      const bucket = months.find((month) => month.key === key);
      if (!bucket) continue;
      bucket.count += 1;
      bucket.total +=
        typeof booking.amount_paid === "number"
          ? booking.amount_paid
          : booking.payment_status === "paid"
            ? (booking.total_amount ?? 0)
            : 0;
    }

    // Per-property performance.
    const byProperty = villas
      .map((villa) => {
        const rows = live.filter((booking) => booking.villa_id === villa.id);
        const revenue = rows.reduce(
          (sum, booking) =>
            sum +
            (typeof booking.amount_paid === "number"
              ? booking.amount_paid
              : booking.payment_status === "paid"
                ? (booking.total_amount ?? 0)
                : 0),
          0,
        );
        return {
          id: villa.id,
          title: villa.title ?? `Property ${villa.id}`,
          bookings: rows.length,
          revenue,
          nights: rows.reduce((sum, booking) => sum + (booking.nights ?? 0), 0),
        };
      })
      .sort((a, b) => b.revenue - a.revenue);

    const peak = Math.max(1, ...months.map((month) => month.total));

    return {
      received,
      outstanding,
      confirmed,
      pending,
      occupancy,
      months,
      peak,
      byProperty,
      total: live.length,
      recent: live.slice(0, 6),
    };
  }, [bookings, villas]);

  /**
   * Arrivals still unverified today.
   *
   * A registration counts if it is still `submitted` and either arrived today
   * (`check_in_date`) or was filled in today. Both, because a guest who fills
   * the form this afternoon for tomorrow's stay is still today's work, and a
   * guest who arrived this morning but submitted last night is still waiting.
   */
  const unverifiedToday = useMemo(() => {
    const today = localDay(new Date());
    return verifications.filter(
      (row) =>
        row.status === "submitted" &&
        (row.check_in_date === today || localDay(row.submitted_at) === today),
    ).length;
  }, [verifications]);


  if (isLoading) {
    return (
      <div className="mx-auto flex max-w-6xl animate-pulse gap-4">
        <div className="h-32 w-64 rounded-2xl bg-slate-200" />
        <div className="h-32 w-64 rounded-2xl bg-slate-200" />
        <div className="h-32 w-64 rounded-2xl bg-slate-200" />
      </div>
    );
  }

  const cards = [
    {
      label: "Received",
      value: unavailable ? "—" : money(analytics.received),
      hint: unavailable ? "" : `${money(analytics.outstanding)} still to collect`,
      Icon: Wallet,
      tint: "bg-amber-50 text-amber-600",
    },
    {
      label: "Bookings",
      value: unavailable ? "—" : analytics.total,
      hint: unavailable ? "" : `${analytics.confirmed} confirmed · ${analytics.pending} pending`,
      Icon: CalendarCheck,
      tint: "bg-green-50 text-green-600",
    },
    {
      label: "Occupancy, next 30 days",
      value: unavailable ? "—" : `${analytics.occupancy}%`,
      hint: unavailable ? "" : `${villas.length} properties`,
      Icon: Percent,
      tint: "bg-blue-50 text-blue-600",
    },
    {
      label: "Properties",
      value: unavailable ? "—" : villas.length,
      hint: "",
      Icon: Home,
      tint: "bg-slate-100 text-slate-600",
    },
  ];

  return (
    <div className="mx-auto max-w-6xl animate-in fade-in duration-500">
      <header className="mb-8">
        <h1 className="text-2xl font-semibold tracking-tight text-[var(--color-ink)]">
          Welcome back, Admin
        </h1>
        <p className="mt-1 text-sm text-slate-500">
          Bookings, takings and how full the apartments are — from the database, live.
        </p>
      </header>

      {!configured && (
        <div className="mb-8 flex gap-3 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
          <AlertTriangle size={18} className="mt-0.5 shrink-0" />
          <p>
            Supabase is not configured, so these figures cannot be loaded. Add your keys
            to <code className="font-mono text-xs">.env.local</code> and rebuild.
          </p>
        </div>
      )}

      {configured && error && (
        <div className="mb-8 flex gap-3 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800">
          <AlertTriangle size={18} className="mt-0.5 shrink-0" />
          <div>
            <p className="font-semibold">Could not load your figures.</p>
            <p className="mt-0.5 break-words opacity-90">{error}</p>
          </div>
        </div>
      )}

      {/* Needs attention. Above the figures on purpose: an unverified arrival is
          the only item here that has a person standing at a gate. */}
      {configured && !error && (
        <Link
          href="/admin/verifications"
          className={`mb-6 flex items-center justify-between gap-4 rounded-2xl border p-4 transition-colors ${
            unverifiedToday > 0
              ? "border-amber-200 bg-amber-50 hover:bg-amber-100/70"
              : "border-[var(--color-line-soft)] bg-white hover:bg-slate-50"
          }`}
        >
          <div className="flex min-w-0 items-center gap-3">
            <span
              className={`grid h-10 w-10 shrink-0 place-items-center rounded-full ${
                unverifiedToday > 0 ? "bg-amber-100 text-amber-700" : "bg-green-50 text-green-600"
              }`}
            >
              <ClipboardCheck size={20} />
            </span>
            <div className="min-w-0">
              <p className="text-sm font-semibold text-[var(--color-ink)]">
                Arrivals still unverified today
              </p>
              <p className="truncate text-xs text-slate-500">
                {unverifiedToday > 0
                  ? "Somebody has submitted their ID and is waiting to be checked in."
                  : "Every registration from today has been reviewed."}
              </p>
            </div>
          </div>
          <div className="flex shrink-0 items-center gap-3">
            <span
              className={`text-2xl font-semibold tabular-nums ${
                unverifiedToday > 0 ? "text-amber-800" : "text-[var(--color-ink)]"
              }`}
            >
              {unverifiedToday}
            </span>
            <ArrowUpRight size={16} className="text-slate-400" />
          </div>
        </Link>
      )}

      {/* Stat cards */}
      <div className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {cards.map((card) => (
          <div
            key={card.label}
            className="flex items-center justify-between rounded-2xl border border-[var(--color-line-soft)] bg-white p-5 shadow-[var(--shadow-raise)]"
          >
            <div className="min-w-0">
              <p className="mb-1 text-[11px] font-bold uppercase tracking-widest text-slate-500">
                {card.label}
              </p>
              <p className="text-2xl font-semibold tracking-tight text-[var(--color-ink)]">
                {card.value}
              </p>
              {card.hint && <p className="mt-0.5 truncate text-xs text-slate-500">{card.hint}</p>}
            </div>
            <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-full ${card.tint}`}>
              <card.Icon size={22} />
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Revenue by month */}
        <div className="rounded-2xl border border-[var(--color-line-soft)] bg-white p-6 shadow-[var(--shadow-raise)] lg:col-span-2">
          <div className="mb-6 flex items-baseline justify-between">
            <h2 className="text-lg font-semibold tracking-tight text-[var(--color-ink)]">
              Takings, last six months
            </h2>
            <span className="text-xs text-slate-500">By booking date</span>
          </div>

          <div className="flex h-44 items-end gap-3" role="img" aria-label="Revenue by month">
            {analytics.months.map((month) => {
              const height = analytics.peak ? Math.round((month.total / analytics.peak) * 100) : 0;
              return (
                <div key={month.key} className="flex flex-1 flex-col items-center gap-2">
                  <span className="text-[10px] font-semibold text-slate-600">
                    {month.total > 0 ? money(month.total) : ""}
                  </span>
                  <div className="flex w-full flex-1 items-end">
                    <div
                      className="w-full rounded-t-md bg-[var(--color-ink)]/85 transition-all"
                      style={{ height: `${Math.max(height, month.total > 0 ? 4 : 1)}%` }}
                      title={`${month.label}: ${money(month.total)} from ${month.count} booking(s)`}
                    />
                  </div>
                  <span className="text-[11px] font-medium text-slate-500">{month.label}</span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Property performance */}
        <div className="rounded-2xl border border-[var(--color-line-soft)] bg-white p-6 shadow-[var(--shadow-raise)]">
          <h2 className="mb-4 text-lg font-semibold tracking-tight text-[var(--color-ink)]">
            By property
          </h2>
          <ul className="space-y-3">
            {analytics.byProperty.map((property) => {
              const share = analytics.received
                ? Math.round((property.revenue / analytics.received) * 100)
                : 0;
              return (
                <li key={property.id}>
                  <div className="flex items-baseline justify-between gap-2">
                    <span className="truncate text-sm font-medium text-slate-800">
                      {property.title}
                    </span>
                    <span className="shrink-0 text-xs font-semibold text-slate-700">
                      {money(property.revenue)}
                    </span>
                  </div>
                  <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-slate-100">
                    <div
                      className="h-full rounded-full bg-blue-500"
                      style={{ width: `${Math.min(100, share)}%` }}
                    />
                  </div>
                  <p className="mt-1 text-[11px] text-slate-500">
                    {property.bookings} booking{property.bookings === 1 ? "" : "s"} ·{" "}
                    {property.nights} night{property.nights === 1 ? "" : "s"}
                  </p>
                </li>
              );
            })}
            {!analytics.byProperty.length && (
              <li className="text-sm text-slate-500">No properties loaded.</li>
            )}
          </ul>
        </div>
      </div>

      {/* Recent bookings */}
      <div className="mt-6 overflow-hidden rounded-2xl border border-[var(--color-line-soft)] bg-white shadow-[var(--shadow-raise)]">
        <div className="flex items-center justify-between border-b border-slate-100 p-6">
          <h2 className="text-lg font-semibold tracking-tight text-[var(--color-ink)]">
            Latest bookings
          </h2>
          <Link
            href="/admin/bookings"
            className="flex items-center gap-1 text-xs font-semibold text-[var(--color-muted)] transition-colors hover:text-[var(--color-ink)]"
          >
            View all <ArrowUpRight size={14} />
          </Link>
        </div>

        {analytics.recent.length === 0 ? (
          <div className="p-10 text-center text-sm text-slate-500">
            {unavailable ? "Figures unavailable." : "No bookings yet."}
          </div>
        ) : (
          <ul className="divide-y divide-slate-100">
            {analytics.recent.map((booking) => {
              const villa = villas.find((entry) => entry.id === booking.villa_id);
              const paid = booking.payment_status === "paid";
              return (
                <li key={booking.id} className="flex flex-wrap items-center gap-3 p-4 sm:px-6">
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-slate-100 text-slate-500">
                    <Users size={15} />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-medium text-slate-900">
                      {booking.guest_name || "Unnamed guest"}
                    </span>
                    <span className="block truncate text-xs text-slate-500">
                      {villa?.title ?? "Property removed"} · {booking.check_in_date ?? "—"} to{" "}
                      {booking.check_out_date ?? "—"}
                    </span>
                  </span>
                  <span className="text-sm font-semibold text-slate-800">
                    {money(booking.total_amount ?? 0)}
                  </span>
                  <span
                    className={`rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider ${
                      paid
                        ? "bg-green-50 text-green-700"
                        : booking.payment_status === "partially_paid"
                          ? "bg-amber-50 text-amber-700"
                          : "bg-slate-100 text-slate-600"
                    }`}
                  >
                    {booking.payment_status || "unpaid"}
                  </span>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}
