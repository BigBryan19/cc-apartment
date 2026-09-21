// app/admin/layout.tsx
"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  LayoutDashboard,
  Home,
  CalendarCheck,
  CalendarOff,
  Settings,
  LogOut,
  FileText,
} from "lucide-react";
import { createClient, isSupabaseConfigured } from "../utils/supabase";

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
  const router = useRouter();
  const [email, setEmail] = useState<string | null>(null);

  // Show who is signed in. The middleware has already guaranteed a session for
  // every route except /admin/login.
  useEffect(() => {
    if (!isSupabaseConfigured()) return;
    let cancelled = false;
    createClient()
      .auth.getUser()
      .then(({ data }) => {
        if (!cancelled) setEmail(data.user?.email ?? null);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const handleSignOut = async () => {
    if (isSupabaseConfigured()) {
      await createClient().auth.signOut();
    }
    router.replace("/admin/login");
    router.refresh();
  };

  // The login page provides its own full-screen layout.
  if (pathname === "/admin/login") {
    return <>{children}</>;
  }

  return (
    <div className="min-h-screen bg-[var(--color-canvas)] flex font-sans">
      {/* ---------------- Desktop sidebar ---------------- */}
      <aside className="w-64 bg-[var(--color-ink)] text-white flex-col hidden md:flex fixed h-full z-10">
        <Link
          href="/admin"
          className="h-20 px-6 flex items-center border-b border-white/10"
        >
          <img
            src="/cc-horinzontal.png"
            alt="Cosy Crest"
            className="h-7 w-auto"
          />
        </Link>

        <nav className="flex-1 py-6 px-4 space-y-1 overflow-y-auto">
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                aria-current={isActive ? "page" : undefined}
                className={`flex items-center gap-3 rounded-xl px-4 py-3 transition-colors ${
                  isActive
                    ? "bg-white/10 text-white"
                    : "text-white/60 hover:bg-white/5 hover:text-white"
                }`}
              >
                <Icon size={19} className="shrink-0" />
                <span className="text-sm font-medium">{item.name}</span>
              </Link>
            );
          })}
        </nav>

        <div className="border-t border-white/10 p-4">
          {email && (
            <p
              className="mb-2 truncate px-4 text-xs text-white/50"
              title={email}
            >
              {email}
            </p>
          )}
          <button
            onClick={handleSignOut}
            className="flex w-full items-center gap-3 rounded-xl px-4 py-3 text-white/60 transition-colors hover:bg-red-500/10 hover:text-red-400"
          >
            <LogOut size={19} className="shrink-0" />
            <span className="text-sm font-medium">Sign out</span>
          </button>
        </div>
      </aside>

      {/* ---------------- Mobile top bar + horizontal nav ---------------- */}
      <div className="md:hidden fixed top-0 inset-x-0 z-20 bg-[var(--color-ink)] text-white">
        <div className="flex h-16 items-center justify-between border-b border-white/10 px-5">
          <Link href="/admin">
            <img
              src="/cc-horinzontal.png"
              alt="Cosy Crest"
              className="h-6 w-auto"
            />
          </Link>
          <button
            onClick={handleSignOut}
            aria-label="Sign out"
            className="rounded-lg p-2 text-white/60 transition-colors hover:bg-white/10 hover:text-white"
          >
            <LogOut size={18} />
          </button>
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
                className={`flex items-center gap-2 whitespace-nowrap rounded-lg px-3.5 py-2 text-xs font-semibold transition-colors ${
                  isActive
                    ? "bg-white/15 text-white"
                    : "text-white/60 hover:bg-white/10 hover:text-white"
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
      <main className="min-w-0 flex-1 p-5 pt-32 md:ml-64 md:p-8 md:pt-8">
        {children}
      </main>
    </div>
  );
}
