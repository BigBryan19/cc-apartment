// app/admin/layout.tsx
"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Home,
  CalendarCheck,
  Settings,
  LogOut,
  FileText,
} from "lucide-react";

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();

  const navItems = [
    { name: "Dashboard", href: "/admin", icon: <LayoutDashboard size={20} /> },
    { name: "Manage Villas", href: "/admin/villas", icon: <Home size={20} /> },
    {
      name: "Bookings",
      href: "/admin/bookings",
      icon: <CalendarCheck size={20} />,
    },
    {
      name: "Create Invoice",
      href: "/admin/invoice",
      icon: <FileText size={20} />,
    },
    { name: "Settings", href: "/admin/settings", icon: <Settings size={20} /> },
  ];

  return (
    <div className="min-h-screen bg-slate-50 flex font-sans">
      {/* Sidebar */}
      <aside className="w-64 bg-slate-700 text-white flex flex-col hidden md:flex fixed h-full z-10">
        <div className="p-6 flex items-center gap-3 border-b border-slate-800">
          <div className="flex items-center gap-2 cursor-pointer z-50">
            <img
              src="/cc-horinzontal.png"
              alt="COSY CREST"
              className="h-6 md:h-7"
            />
          </div>
        </div>

        <nav className="flex-1 py-6 px-4 space-y-2">
          {navItems.map((item) => {
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.name}
                href={item.href}
                className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${
                  isActive
                    ? "bg-slate-800 text-white shadow-md"
                    : "text-slate-400 hover:bg-slate-800 hover:text-white"
                }`}
              >
                {item.icon}
                <span className="text-sm font-medium tracking-wide">
                  {item.name}
                </span>
              </Link>
            );
          })}
        </nav>

        <div className="p-4 border-t border-slate-800">
          <button className="flex items-center gap-3 px-4 py-3 w-full rounded-xl text-slate-400 hover:bg-red-500/10 hover:text-red-500 transition-all">
            <LogOut size={20} />
            <span className="text-sm font-medium tracking-wide">Sign Out</span>
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 md:ml-64 p-8">{children}</main>
    </div>
  );
}
