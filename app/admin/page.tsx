// app/admin/page.tsx
"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { createClient, isSupabaseConfigured } from "../utils/supabase";
import {
  Home,
  CalendarCheck,
  Wallet,
  ArrowUpRight,
  AlertTriangle,
} from "lucide-react";

export default function AdminDashboard() {
  const [stats, setStats] = useState({ villas: 0, bookings: 0 });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  const configured = isSupabaseConfigured();
  // Both states mean "we do not know the real numbers" — never render a 0 that
  // the admin would read as fact.
  const unavailable = !configured || Boolean(error);

  useEffect(() => {
    if (!configured) {
      setIsLoading(false);
      return;
    }

    let cancelled = false;

    const fetchStats = async () => {
      const supabase = createClient();

      try {
        // Both counts in parallel — sequentially these two round trips used to
        // stack up, and a slow network made the skeleton linger for ages.
        const [villasResult, bookingsResult] = await Promise.all([
          supabase.from("villas").select("*", { count: "exact", head: true }),
          supabase.from("bookings").select("*", { count: "exact", head: true }),
        ]);

        if (cancelled) return;

        const failure = villasResult.error || bookingsResult.error;
        if (failure) {
          // Previously the errors were ignored and the dashboard cheerfully
          // reported 0 properties and 0 bookings, which reads as "you have no
          // business" rather than "we could not reach the database".
          setError(failure.message);
          return;
        }

        setStats({
          villas: villasResult.count ?? 0,
          bookings: bookingsResult.count ?? 0,
        });
      } catch (err) {
        if (!cancelled) {
          setError(
            err instanceof Error
              ? err.message
              : "Could not reach the database.",
          );
        }
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    };

    fetchStats();
    return () => {
      cancelled = true;
    };
  }, [configured]);

  if (isLoading) {
    return (
      <div className="animate-pulse flex gap-4">
        <div className="w-64 h-32 bg-slate-200 rounded-2xl"></div>
        <div className="w-64 h-32 bg-slate-200 rounded-2xl"></div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto animate-in fade-in duration-500">
      <header className="mb-10">
        <h1 className="text-2xl font-semibold tracking-tight text-[var(--color-ink)] mb-2">
          Welcome back, Admin
        </h1>
        <p className="text-slate-500 text-sm">
          Here is what is happening at Cosy Crest today.
        </p>
      </header>

      {/* A failed or missing connection must not look like a healthy zero. */}
      {!configured && (
        <div className="mb-8 flex gap-3 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
          <AlertTriangle size={18} className="mt-0.5 shrink-0" />
          <p>
            Supabase is not configured, so these figures cannot be loaded. Add
            your keys to <code className="font-mono text-xs">.env.local</code>{" "}
            and rebuild — see <code className="font-mono text-xs">SETUP.md</code>
            .
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

      {/* Stat Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
        <div className="bg-white p-6 rounded-2xl border border-[var(--color-line-soft)] shadow-[var(--shadow-raise)] flex items-center justify-between group">
          <div>
            <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-1">
              Total Properties
            </p>
            <h3 className="text-2xl font-semibold tracking-tight text-[var(--color-ink)]">
              {unavailable ? "—" : stats.villas}
            </h3>
          </div>
          <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-full flex items-center justify-center group-hover:scale-110 transition-transform">
            <Home size={24} />
          </div>
        </div>

        <div className="bg-white p-6 rounded-2xl border border-[var(--color-line-soft)] shadow-[var(--shadow-raise)] flex items-center justify-between group">
          <div>
            <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-1">
              Total Bookings
            </p>
            <h3 className="text-2xl font-semibold tracking-tight text-[var(--color-ink)]">
              {unavailable ? "—" : stats.bookings}
            </h3>
          </div>
          <div className="w-12 h-12 bg-green-50 text-green-600 rounded-full flex items-center justify-center group-hover:scale-110 transition-transform">
            <CalendarCheck size={24} />
          </div>
        </div>

        <div className="bg-white p-6 rounded-2xl border border-[var(--color-line-soft)] shadow-[var(--shadow-raise)] flex items-center justify-between group">
          <div>
            <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-1">
              Est. Revenue
            </p>
            {/* Not yet computed from paid bookings — a hardcoded placeholder. */}
            <h3 className="text-2xl font-semibold tracking-tight text-[var(--color-ink)]">
              {unavailable ? "—" : "₵0"}
            </h3>
          </div>
          <div className="w-12 h-12 bg-amber-50 text-amber-600 rounded-full flex items-center justify-center group-hover:scale-110 transition-transform">
            <Wallet size={24} />
          </div>
        </div>
      </div>

      {/* Placeholder for Recent Activity */}
      <div className="bg-white rounded-2xl border border-[var(--color-line-soft)] shadow-[var(--shadow-raise)] overflow-hidden">
        <div className="p-6 border-b border-slate-100 flex justify-between items-center">
          <h2 className="text-lg font-semibold tracking-tight text-[var(--color-ink)]">
            Recent Bookings
          </h2>
          <Link
            href="/admin/bookings"
            className="flex items-center gap-1 text-xs font-semibold text-[var(--color-muted)] transition-colors hover:text-[var(--color-ink)]"
          >
            View all <ArrowUpRight size={14} />
          </Link>
        </div>
        <div className="p-12 text-center text-slate-500 text-sm">
          No bookings yet. Let&apos;s get some customers!
        </div>
      </div>
    </div>
  );
}
