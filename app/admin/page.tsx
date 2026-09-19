// app/admin/page.tsx
"use client";

import React, { useEffect, useState } from "react";
import { createClient } from "../utils/supabase";
import { Home, CalendarCheck, Wallet, ArrowUpRight } from "lucide-react";

export default function AdminDashboard() {
  const [stats, setStats] = useState({ villas: 0, bookings: 0 });
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      const supabase = createClient();

      // Fetch total villas count
      const { count: villasCount } = await supabase
        .from("villas")
        .select("*", { count: "exact", head: true });

      // Fetch total bookings count
      const { count: bookingsCount } = await supabase
        .from("bookings")
        .select("*", { count: "exact", head: true });

      setStats({
        villas: villasCount || 0,
        bookings: bookingsCount || 0,
      });
      setIsLoading(false);
    };

    fetchStats();
  }, []);

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
        <h1 className="text-3xl font-serif text-slate-900 mb-2">
          Welcome back, Admin
        </h1>
        <p className="text-slate-500 text-sm">
          Here is what is happening at Cosy Crest today.
        </p>
      </header>

      {/* Stat Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex items-center justify-between group">
          <div>
            <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-1">
              Total Properties
            </p>
            <h3 className="text-3xl font-serif text-slate-900">
              {stats.villas}
            </h3>
          </div>
          <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-full flex items-center justify-center group-hover:scale-110 transition-transform">
            <Home size={24} />
          </div>
        </div>

        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex items-center justify-between group">
          <div>
            <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-1">
              Total Bookings
            </p>
            <h3 className="text-3xl font-serif text-slate-900">
              {stats.bookings}
            </h3>
          </div>
          <div className="w-12 h-12 bg-green-50 text-green-600 rounded-full flex items-center justify-center group-hover:scale-110 transition-transform">
            <CalendarCheck size={24} />
          </div>
        </div>

        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex items-center justify-between group">
          <div>
            <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-1">
              Est. Revenue
            </p>
            <h3 className="text-3xl font-serif text-slate-900">₵0</h3>
          </div>
          <div className="w-12 h-12 bg-amber-50 text-amber-600 rounded-full flex items-center justify-center group-hover:scale-110 transition-transform">
            <Wallet size={24} />
          </div>
        </div>
      </div>

      {/* Placeholder for Recent Activity */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
        <div className="p-6 border-b border-slate-100 flex justify-between items-center">
          <h2 className="text-lg font-serif text-slate-900">Recent Bookings</h2>
          <button className="text-xs font-bold text-blue-600 uppercase tracking-widest flex items-center gap-1 hover:text-blue-700">
            View All <ArrowUpRight size={14} />
          </button>
        </div>
        <div className="p-12 text-center text-slate-500 text-sm">
          No bookings yet. Let&apos;s get some customers!
        </div>
      </div>
    </div>
  );
}
