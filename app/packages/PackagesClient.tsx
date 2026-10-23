"use client";

import React, { useState } from "react";
import Link from "next/link";
import { ArrowUpRight, CalendarHeart, Cake, PartyPopper, ChevronDown } from "lucide-react";
import { PACKAGES, primaryActionLabel, type PackageCategory } from "../lib/packages";

const CATEGORY_ICON: Record<PackageCategory, any> = {
  honeymoon: CalendarHeart,
  birthday: Cake,
  private_gathering: PartyPopper,
};

const CATEGORY_ORDER: PackageCategory[] = ["honeymoon", "birthday", "private_gathering"];

const CATEGORY_LABEL: Record<PackageCategory, string> = {
  honeymoon: "Honeymoon & Romance",
  birthday: "Birthday Celebrations",
  private_gathering: "Private Gatherings",
};

const CATEGORY_INTRO: Record<PackageCategory, string> = {
  honeymoon: "A private, quietly staged stay for two.",
  birthday: "Choose between an overnight room setup or a hosted event with guests.",
  private_gathering: "A casual party or private function at one of our properties.",
};

function accommodationNote(slug: string): string {
  if (slug === "birthday-celebration" || slug === "private-gathering") {
    return "Accommodation for attendees is quoted separately.";
  }
  return "Accommodation is selected during booking.";
}

export default function PackagesClient() {
  const [activeCategory, setActiveCategory] = useState<PackageCategory>("honeymoon");
  const [isOpen, setIsOpen] = useState(false);

  const entries = PACKAGES.filter((entry) => entry.category === activeCategory);
  const Icon = CATEGORY_ICON[activeCategory];

  return (
    <div className="mt-12">
      {/* Category Selection: Tabs for Desktop, Dropdown for Mobile */}
      <div className="relative mb-10">
        {/* Desktop Tabs */}
        <div className="hidden items-center gap-1 rounded-2xl border border-[var(--color-line-soft)] bg-[var(--color-canvas)] p-1.5 sm:flex">
          {CATEGORY_ORDER.map((cat) => (
            <button
              key={cat}
              onClick={() => setActiveCategory(cat)}
              className={`flex-1 rounded-xl px-4 py-3 text-sm font-semibold transition-all ${
                activeCategory === cat
                  ? "bg-white text-[var(--color-ink)] shadow-sm"
                  : "text-[var(--color-muted)] hover:text-[var(--color-ink)]"
              }`}
            >
              {CATEGORY_LABEL[cat]}
            </button>
          ))}
        </div>

        {/* Mobile Dropdown */}
        <div className="sm:hidden">
          <button
            onClick={() => setIsOpen(!isOpen)}
            className="flex w-full items-center justify-between rounded-2xl border border-[var(--color-ink)] bg-white px-5 py-4 text-left font-semibold text-[var(--color-ink)] shadow-sm"
          >
            <span className="flex items-center gap-3">
              <Icon size={18} />
              {CATEGORY_LABEL[activeCategory]}
            </span>
            <ChevronDown size={18} className={`transition-transform duration-200 ${isOpen ? "rotate-180" : ""}`} />
          </button>
          
          {isOpen && (
            <div className="absolute left-0 right-0 top-full z-20 mt-2 overflow-hidden rounded-2xl border border-[var(--color-line)] bg-white shadow-xl">
              {CATEGORY_ORDER.map((cat) => {
                const CatIcon = CATEGORY_ICON[cat];
                return (
                  <button
                    key={cat}
                    onClick={() => {
                      setActiveCategory(cat);
                      setIsOpen(false);
                    }}
                    className={`flex w-full items-center gap-3 px-5 py-4 text-left text-sm font-medium transition-colors ${
                      activeCategory === cat
                        ? "bg-[var(--color-canvas)] text-[var(--color-ink)]"
                        : "text-[var(--color-muted)] hover:bg-[var(--color-canvas)] hover:text-[var(--color-ink)]"
                    }`}
                  >
                    <CatIcon size={16} />
                    {CATEGORY_LABEL[cat]}
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Active Category Intro */}
      <div className="mb-8 max-w-2xl">
        <h2 className="text-2xl font-semibold tracking-tight text-[var(--color-ink)]">
          {CATEGORY_LABEL[activeCategory]}
        </h2>
        <p className="mt-2 text-sm leading-relaxed text-[var(--color-muted)]">
          {CATEGORY_INTRO[activeCategory]}
        </p>
      </div>

      {/* Packages Grid */}
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-2">
        {entries.map((entry) => (
          <Link
            key={entry.slug}
            href={`/packages/${entry.slug}`}
            className="group flex flex-col overflow-hidden rounded-3xl border border-[var(--color-line-soft)] bg-white transition-all duration-300 hover:border-[var(--color-ink)] hover:shadow-xl"
          >
            <div className="relative h-64 w-full overflow-hidden">
              <img
                src={entry.image}
                alt={entry.name}
                className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-105"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent" />
            </div>
            
            <div className="flex flex-1 flex-col p-8">
              <h3 className="text-xl font-semibold leading-tight text-[var(--color-ink)]">
                {entry.name}
              </h3>
              <p className="mt-4 flex-1 text-sm leading-relaxed text-[var(--color-muted)]">
                {entry.summary}
              </p>

              <div className="mt-8 flex items-center justify-between border-t border-[var(--color-line-soft)] pt-6">
                <div className="min-w-0">
                  <span className="block text-[10px] font-bold uppercase tracking-wider text-[var(--color-faint)]">
                    Accommodation
                  </span>
                  <span className="mt-1 block truncate text-xs font-medium text-[var(--color-ink-soft)]">
                    {accommodationNote(entry.slug)}
                  </span>
                </div>
                <div className="shrink-0 rounded-full bg-[var(--color-ink)] px-5 py-2.5 text-xs font-bold text-white transition-opacity group-hover:opacity-90">
                  Request a Quote
                </div>
              </div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
