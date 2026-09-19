// app/admin/layout.tsx
"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Home,
  CalendarCheck,
  CalendarOff,
  Settings,
  LogOut,
  FileText,
} from "lucide-react";

const NAV_ITEMS = [
  { name: "Dashboard", href: "/admin", icon: LayoutDashboard },
  { name: "Manage Villas", href: "/admin/villas", icon: Home },
  { name: "Availability", href: "/admin/availability", icon: CalendarOff },
  { name: "Bookings", href: "/admin/bookings", icon: CalendarCheck },
  { name: "Create Invoice", href: "/admin/invoice", icon: FileText },
  { name: "Settings", href: "/admin/settings", icon: Settings },
];

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();

  return (
    <div className="min-h-screen bg-slate-50 flex font-sans">
      {/* ---------------- Desktop sidebar ---------------- */}
      <aside className="w-64 bg-slate-700 text-white flex-col hidden md:flex fixed h-full z-10">
        <div className="h-20 px-6 flex items-center border-b border-slate-800/60">
          <img
            src="/cc-horinzontal.png"
            alt="COSY CREST"
            className="h-7 w-auto"
          />
        </div>

        <nav className="flex-1 py-6 px-4 space-y-1.5 overflow-y-auto">
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                aria-current={isActive ? "page" : undefined}
                className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${
                  isActive
                    ? "bg-slate-800 text-white shadow-md"
                    : "text-slate-300 hover:bg-slate-800 hover:text-white"
                }`}
              >
                <Icon size={20} className="shrink-0" />
                <span className="text-sm font-medium tracking-wide">
                  {item.name}
                </span>
              </Link>
            );
          })}
        </nav>

        <div className="p-4 border-t border-slate-800/60">
          <button className="flex items-center gap-3 px-4 py-3 w-full rounded-xl text-slate-300 hover:bg-red-500/10 hover:text-red-400 transition-all">
            <LogOut size={20} className="shrink-0" />
            <span className="text-sm font-medium tracking-wide">Sign Out</span>
          </button>
        </div>
      </aside>

      {/* ---------------- Mobile top bar + horizontal nav ---------------- */}
      <div className="md:hidden fixed top-0 inset-x-0 z-20 bg-slate-700 text-white">
        <div className="h-16 px-5 flex items-center border-b border-slate-800/60">
          <img
            src="/cc-horinzontal.png"
            alt="COSY CREST"
            className="h-6 w-auto"
          />
        </div>
        <nav className="flex gap-1 overflow-x-auto px-3 py-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                aria-current={isActive ? "page" : undefined}
                className={`flex items-center gap-2 px-3.5 py-2 rounded-lg whitespace-nowrap text-xs font-semibold transition-colors ${
                  isActive
                    ? "bg-slate-800 text-white"
                    : "text-slate-300 hover:bg-slate-800/60 hover:text-white"
                }`}
              >
                <Icon size={15} className="shrink-0" />
                {item.name}
              </Link>
            );
          })}
        </nav>
      </div>

      {/* ---------------- Main content ---------------- */}
      <main className="flex-1 md:ml-64 pt-32 md:pt-0 p-5 md:p-8 min-w-0">
        {children}
      </main>
    </div>
  );
}
