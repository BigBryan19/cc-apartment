// app/components/Testimonials.tsx
"use client";

import React, { useState, useEffect } from "react";
import { Star, ChevronLeft, ChevronRight } from "lucide-react";

const REVIEWS = [
  {
    name: "Sarah & Kwame",
    property: "Lakeside Estate",
    text: "The perfect romantic getaway. The honeymoon setup was breathtaking — the attention to detail from the Cosy Crest team made our weekend unforgettable.",
    rating: 5,
  },
  {
    name: "Michael T.",
    property: "Adenta Serenity",
    text: "Booked this for a business trip and was blown away. Extremely fast Wi-Fi, very secure, and the grand piano was a beautiful touch of luxury.",
    rating: 5,
  },
  {
    name: "The Osei Family",
    property: "Aburi Mountain Retreat",
    text: "Waking up to the mountain breeze was incredible. We added the birthday package for our daughter and the decorations were absolutely stunning.",
    rating: 5,
  },
];

const Testimonials: React.FC = () => {
  const [index, setIndex] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setIndex((prev) => (prev === REVIEWS.length - 1 ? 0 : prev + 1));
    }, 8000);
    return () => clearInterval(timer);
  }, []);

  const prev = () =>
    setIndex((i) => (i === 0 ? REVIEWS.length - 1 : i - 1));
  const next = () =>
    setIndex((i) => (i === REVIEWS.length - 1 ? 0 : i + 1));

  const review = REVIEWS[index];

  return (
    <section id="reviews" className="section-y bg-[var(--color-ink)] text-white">
      <div className="shell">
        <div className="flex flex-col gap-10 lg:flex-row lg:items-center lg:gap-20">
          {/* ---- Left: label + pager ---- */}
          <div className="lg:w-1/3">
            <span className="text-[11px] font-bold uppercase tracking-[0.12em] text-white/45">
              Guest reviews
            </span>
            <h2 className="mt-2 text-3xl font-semibold tracking-tight sm:text-4xl">
              Loved by our guests
            </h2>

            <div className="mt-6 flex items-center gap-3">
              <span className="flex items-center gap-1">
                {[0, 1, 2, 3, 4].map((i) => (
                  <Star
                    key={i}
                    size={15}
                    className="fill-white text-white"
                  />
                ))}
              </span>
              <span className="text-sm text-white/70">4.9 average</span>
            </div>

            <div className="mt-8 hidden gap-3 lg:flex">
              <button
                onClick={prev}
                aria-label="Previous review"
                className="flex h-10 w-10 items-center justify-center rounded-full border border-white/25 text-white transition-colors hover:bg-white hover:text-[var(--color-ink)]"
              >
                <ChevronLeft size={18} />
              </button>
              <button
                onClick={next}
                aria-label="Next review"
                className="flex h-10 w-10 items-center justify-center rounded-full border border-white/25 text-white transition-colors hover:bg-white hover:text-[var(--color-ink)]"
              >
                <ChevronRight size={18} />
              </button>
            </div>
          </div>

          {/* ---- Right: quote ---- */}
          <div className="lg:w-2/3">
            <blockquote className="min-h-[210px] sm:min-h-[180px]">
              <p className="text-xl font-light leading-relaxed text-white/90 sm:text-2xl">
                &ldquo;{review.text}&rdquo;
              </p>
              <footer className="mt-7 flex items-center gap-3">
                <span className="flex h-10 w-10 items-center justify-center rounded-full bg-white/10 text-sm font-semibold">
                  {review.name.charAt(0)}
                </span>
                <div>
                  <cite className="block text-sm font-semibold not-italic">
                    {review.name}
                  </cite>
                  <span className="text-xs text-white/55">
                    {review.property}
                  </span>
                </div>
              </footer>
            </blockquote>

            {/* Dots + mobile pager */}
            <div className="mt-8 flex items-center justify-between">
              <div className="flex gap-2">
                {REVIEWS.map((r, i) => (
                  <button
                    key={r.name}
                    onClick={() => setIndex(i)}
                    aria-label={`Show review from ${r.name}`}
                    className={`h-1.5 rounded-full transition-all duration-300 ${
                      i === index ? "w-8 bg-white" : "w-1.5 bg-white/35 hover:bg-white/60"
                    }`}
                  />
                ))}
              </div>

              <div className="flex gap-3 lg:hidden">
                <button
                  onClick={prev}
                  aria-label="Previous review"
                  className="flex h-9 w-9 items-center justify-center rounded-full border border-white/25 text-white"
                >
                  <ChevronLeft size={17} />
                </button>
                <button
                  onClick={next}
                  aria-label="Next review"
                  className="flex h-9 w-9 items-center justify-center rounded-full border border-white/25 text-white"
                >
                  <ChevronRight size={17} />
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default Testimonials;
