"use client";

import React, { useEffect, useState } from "react";
import { DESTINATION_SLIDE_MS, type DestinationPhoto } from "../lib/destinations";

/**
 * A slow cross-fade through destination photographs.
 *
 * Deliberate choices:
 *   • 5 seconds per photograph. Any faster and the captions cannot be read.
 *   • Cross-fade rather than a slide, so a card that is partly off-screen on a
 *     phone does not lurch sideways.
 *   • The place name sits on the left, over the image, because that is the part
 *     a guest is choosing between.
 *   • Every photograph is stacked and only opacity changes, so the first paint is
 *     the first photograph and there is no flash while the rest load.
 *   • `prefers-reduced-motion` stops the rotation entirely — the first
 *     photograph stays, and no CSS transition runs.
 */
export default function DestinationSlideshow({
  photos,
  title,
}: {
  photos: DestinationPhoto[];
  /** Used to build unique, meaningful alt text per slide. */
  title: string;
}) {
  const [index, setIndex] = useState(0);
  const [reducedMotion, setReducedMotion] = useState(false);

  useEffect(() => {
    const query = window.matchMedia("(prefers-reduced-motion: reduce)");
    const apply = () => setReducedMotion(query.matches);
    apply();
    query.addEventListener("change", apply);
    return () => query.removeEventListener("change", apply);
  }, []);

  useEffect(() => {
    if (reducedMotion || photos.length < 2) return;
    const timer = window.setInterval(
      () => setIndex((current) => (current + 1) % photos.length),
      DESTINATION_SLIDE_MS,
    );
    return () => window.clearInterval(timer);
  }, [photos.length, reducedMotion]);

  if (!photos.length) return null;

  return (
    <>
      {photos.map((photo, position) => (
        <img
          key={photo.src}
          src={photo.src}
          alt={`${photo.name} — ${title}`}
          loading={position === 0 ? "eager" : "lazy"}
          aria-hidden={position === index ? undefined : true}
          className={`absolute inset-0 h-full w-full object-cover transition-opacity duration-700 ease-out ${
            position === index ? "opacity-100" : "opacity-0"
          }`}
        />
      ))}

      {/* Place name, left side over the photograph. */}
      <span className="pointer-events-none absolute left-4 top-4 max-w-[75%] rounded-full bg-black/45 px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.12em] text-white backdrop-blur-sm">
        {photos[index]?.name}
      </span>
    </>
  );
}
