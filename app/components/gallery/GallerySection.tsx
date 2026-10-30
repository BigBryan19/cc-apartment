// app/components/gallery/GallerySection.tsx
// ---------------------------------------------------------------------------
// Media & Gallery.
//
// WHAT IS SHOWN
//
//   Real photographs and walkthrough videos of the three apartments, plus any
//   media the owner has added at /admin/gallery. Categories the owner has not
//   filled yet (birthdays, couples, other experiences) are still offered as
//   filters, and say honestly that nothing has been published — no invented
//   "recent stay" and no borrowed stock scene.
//
// PLAYBACK
//
//   Photos open in a lightbox. Videos open in a <video controls> player with the
//   controls visible, never autoplaying audio. Tiles use the poster frame with a
//   play button, so a grid of videos costs one thumbnail each rather than three
//   half-downloaded movies.
// ---------------------------------------------------------------------------

"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import { ChevronLeft, ChevronRight, Play, X, Image as ImageIcon, Video } from "lucide-react";
import {
  DEFAULT_GALLERY,
  GALLERY_EMPTY_MESSAGE,
  GALLERY_FILTERS,
  filterGallery,
  galleryCounts,
  type GalleryFilter,
  type GalleryItem,
} from "../../lib/gallery";

interface GallerySectionProps {
  /** Items to display. Defaults to the bundled, real-media catalogue. */
  items?: GalleryItem[];
  /** Full-page variant: more columns, no outer section padding. */
  variant?: "section" | "page";
  heading?: string;
}

export default function GallerySection({
  items = DEFAULT_GALLERY,
  variant = "section",
  heading = "Media & Gallery",
}: GallerySectionProps) {
  const [filter, setFilter] = useState<GalleryFilter>("all");
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  const visible = useMemo(() => filterGallery(items, filter), [items, filter]);
  const counts = useMemo(() => galleryCounts(items), [items]);

  const active: GalleryItem | null =
    openIndex !== null && visible[openIndex] ? visible[openIndex] : null;

  const close = useCallback(() => setOpenIndex(null), []);
  const step = useCallback(
    (delta: number) => {
      setOpenIndex((current) => {
        if (current === null) return current;
        const next = current + delta;
        if (next < 0) return visible.length - 1;
        if (next >= visible.length) return 0;
        return next;
      });
    },
    [visible.length],
  );

  // Keyboard control for the lightbox: Escape closes, arrows step.
  useEffect(() => {
    if (openIndex === null) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") close();
      if (event.key === "ArrowRight") step(1);
      if (event.key === "ArrowLeft") step(-1);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [openIndex, close, step]);

  // Lock background scroll while the lightbox is open.
  useEffect(() => {
    if (openIndex === null) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previous;
    };
  }, [openIndex]);

  const isPage = variant === "page";
  const gridClass = isPage
    ? "grid grid-cols-2 gap-3 sm:grid-cols-3 md:gap-4 lg:grid-cols-4"
    : "grid grid-cols-2 gap-3 sm:grid-cols-3 md:gap-4 lg:grid-cols-4";

  return (
    <section
      id="gallery"
      className={isPage ? "" : "section-y bg-white"}
      aria-labelledby="gallery-heading"
    >
      <div className={isPage ? "" : "shell"}>
        <div className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
          <div className="max-w-2xl">
            <span className="eyebrow">Gallery</span>
            <h2
              id="gallery-heading"
              className="mt-2 text-3xl font-semibold tracking-tight text-[var(--color-ink)] sm:text-4xl"
            >
              {heading}
            </h2>
            <p className="mt-3 text-sm leading-relaxed text-[var(--color-muted)]">
              Real photographs and walkthrough videos of our apartments in Aburi,
              Adenta and Lakeside Estate.
            </p>
          </div>
        </div>

        {/* Filters */}
        <div
          className="mt-7 flex flex-wrap gap-2"
          role="tablist"
          aria-label="Filter gallery by category"
        >
          {GALLERY_FILTERS.map((option) => {
            const selected = filter === option.id;
            const count = counts[option.id];
            return (
              <button
                key={option.id}
                role="tab"
                aria-selected={selected}
                onClick={() => {
                  setFilter(option.id);
                  setOpenIndex(null);
                }}
                className={`inline-flex items-center gap-2 rounded-full border px-4 py-2 text-sm font-medium transition-colors ${
                  selected
                    ? "border-[var(--color-ink)] bg-[var(--color-ink)] text-white"
                    : "border-[var(--color-line)] bg-white text-[var(--color-ink-soft)] hover:border-[var(--color-ink)] hover:text-[var(--color-ink)]"
                }`}
              >
                {option.label}
                <span
                  className={`text-[11px] ${
                    selected ? "text-white/60" : "text-[var(--color-faint)]"
                  }`}
                >
                  {count}
                </span>
              </button>
            );
          })}
        </div>

        {/* Grid, or an honest empty state */}
        {visible.length === 0 ? (
          <div className="mt-8 rounded-2xl border border-dashed border-[var(--color-line)] bg-[var(--color-canvas)] px-6 py-14 text-center">
            <ImageIcon
              size={28}
              className="mx-auto mb-3 text-[var(--color-faint)]"
              aria-hidden="true"
            />
            <p className="mx-auto max-w-md text-sm leading-relaxed text-[var(--color-muted)]">
              {GALLERY_EMPTY_MESSAGE[filter]}
            </p>
          </div>
        ) : (
          <ul className={`mt-8 ${gridClass}`}>
            {visible.map((item, index) => (
              <li key={item.id}>
                <button
                  type="button"
                  onClick={() => setOpenIndex(index)}
                  className="group relative block aspect-[4/3] w-full overflow-hidden rounded-xl bg-[var(--color-canvas)]"
                  aria-label={
                    item.type === "video"
                      ? `Play video: ${item.title}`
                      : `View photo: ${item.title}`
                  }
                >
                  <img
                    src={item.type === "video" ? (item.poster ?? item.src) : item.src}
                    alt={item.title}
                    loading={index < 4 ? "eager" : "lazy"}
                    decoding="async"
                    className="h-full w-full object-cover transition-transform duration-500 ease-out group-hover:scale-105"
                  />

                  <span className="absolute inset-0 bg-gradient-to-t from-black/55 via-transparent to-transparent opacity-70 transition-opacity group-hover:opacity-90" />

                  {item.type === "video" && (
                    <span className="absolute inset-0 flex items-center justify-center">
                      <span className="flex h-12 w-12 items-center justify-center rounded-full bg-white/90 text-[var(--color-ink)] shadow-lg transition-transform duration-300 group-hover:scale-110">
                        <Play size={18} fill="currentColor" aria-hidden="true" />
                      </span>
                    </span>
                  )}

                  <span className="absolute inset-x-0 bottom-0 flex items-center justify-between gap-2 p-3">
                    <span className="truncate text-[12px] font-medium text-white">
                      {item.title}
                    </span>
                    <span className="shrink-0 text-white/70">
                      {item.type === "video" ? (
                        <Video size={13} aria-hidden="true" />
                      ) : null}
                    </span>
                  </span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* ---------------- Lightbox ---------------- */}
      {active && (
        <div
          className="fixed inset-0 z-[200] flex items-center justify-center bg-black/92 p-4"
          role="dialog"
          aria-modal="true"
          aria-label={active.title}
          onClick={close}
        >
          <button
            type="button"
            onClick={close}
            aria-label="Close"
            className="absolute right-4 top-4 z-10 rounded-full bg-white/10 p-2.5 text-white transition-colors hover:bg-white/20"
          >
            <X size={20} />
          </button>

          {visible.length > 1 && (
            <>
              <button
                type="button"
                onClick={(event) => {
                  event.stopPropagation();
                  step(-1);
                }}
                aria-label="Previous"
                className="absolute left-3 z-10 rounded-full bg-white/10 p-3 text-white transition-colors hover:bg-white/20 md:left-6"
              >
                <ChevronLeft size={22} />
              </button>
              <button
                type="button"
                onClick={(event) => {
                  event.stopPropagation();
                  step(1);
                }}
                aria-label="Next"
                className="absolute right-3 z-10 rounded-full bg-white/10 p-3 text-white transition-colors hover:bg-white/20 md:right-6"
              >
                <ChevronRight size={22} />
              </button>
            </>
          )}

          <div
            className="max-h-full w-full max-w-5xl"
            onClick={(event) => event.stopPropagation()}
          >
            {active.type === "video" ? (
              <video
                key={active.id}
                src={active.src}
                poster={active.poster}
                controls
                autoPlay
                playsInline
                preload="metadata"
                className="mx-auto max-h-[80vh] w-full rounded-lg bg-black"
              >
                Your browser does not support embedded video.
              </video>
            ) : (
              <img
                src={active.src}
                alt={active.title}
                className="mx-auto max-h-[80vh] w-auto max-w-full rounded-lg object-contain"
              />
            )}

            <div className="mx-auto mt-3 max-w-3xl text-center">
              <p className="text-sm font-medium text-white">{active.title}</p>
              {active.caption && (
                <p className="mt-1 text-xs leading-relaxed text-white/60">
                  {active.caption}
                </p>
              )}
              <p className="mt-2 text-[10px] uppercase tracking-[0.14em] text-white/35">
                {openIndex !== null ? openIndex + 1 : 1} / {visible.length}
              </p>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
