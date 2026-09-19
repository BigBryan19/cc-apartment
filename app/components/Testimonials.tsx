// app/components/Testimonials.tsx
"use client";

import React, { useState, useEffect } from "react";
import { Star, Quote, ChevronLeft, ChevronRight } from "lucide-react";

const Testimonials: React.FC = () => {
  const [currentIndex, setCurrentIndex] = useState(0);

  const reviews = [
    {
      name: "Sarah & Kwame",
      property: "Lakeside Estate",
      text: "The perfect romantic getaway! The honeymoon setup was breathtaking. The attention to detail from the Cosy Crest team made our weekend unforgettable.",
      rating: 5,
    },
    {
      name: "Michael T.",
      property: "Adenta Serenity",
      text: "Booked this for a business trip and was blown away. Extremely fast WiFi, very secure, and the grand piano was a beautiful touch of luxury.",
      rating: 5,
    },
    {
      name: "The Osei Family",
      property: "Aburi Mountain Retreat",
      text: "Waking up to the mountain breeze was incredible. We added the birthday package for our daughter, and the decorations were absolutely stunning.",
      rating: 5,
    },
  ];

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentIndex((prev) => (prev === reviews.length - 1 ? 0 : prev + 1));
    }, 8000);
    return () => clearInterval(timer);
  }, [reviews.length]);

  const handlePrev = () =>
    setCurrentIndex((prev) => (prev === 0 ? reviews.length - 1 : prev - 1));
  const handleNext = () =>
    setCurrentIndex((prev) => (prev === reviews.length - 1 ? 0 : prev + 1));

  return (
    <section
      className="py-24 bg-slate-900 text-white px-4 md:px-12 relative overflow-hidden"
      id="reviews"
    >
      <div className="absolute -top-40 -right-40 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl pointer-events-none"></div>

      <div className="max-w-6xl mx-auto relative z-10">
        <div className="flex flex-col items-center text-center mb-16">
          <Quote size={40} className="text-white/20 mb-6" />
          <h2 className="text-4xl md:text-5xl font-serif mb-4">
            Guest Experiences
          </h2>
          <p className="text-white/60 text-sm max-w-xl">
            Don&apos;t just take our word for it. Here is what our guests have to
            say about their stay.
          </p>
        </div>

        <div className="relative max-w-4xl mx-auto">
          <div className="overflow-hidden">
            <div
              className="flex transition-transform duration-700 ease-in-out"
              style={{ transform: `translateX(-${currentIndex * 100}%)` }}
            >
              {reviews.map((review, idx) => (
                <div
                  key={idx}
                  className="w-full shrink-0 px-4 md:px-12 text-center"
                >
                  <div className="flex justify-center gap-1 mb-6">
                    {[...Array(review.rating)].map((_, i) => (
                      <Star
                        key={i}
                        size={18}
                        className="text-amber-400 fill-amber-400"
                      />
                    ))}
                  </div>
                  <p className="text-xl md:text-3xl font-light leading-relaxed text-white/90 mb-8 italic">
                     &quot;{review.text}&quot;
                  </p>
                  <div>
                    <h4 className="font-bold text-sm tracking-widest uppercase">
                      {review.name}
                    </h4>
                    <p className="text-xs text-blue-400 mt-1">
                      {review.property}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <button
            onClick={handlePrev}
            className="absolute left-0 top-1/2 -translate-y-1/2 p-3 bg-white/5 hover:bg-white/20 rounded-full backdrop-blur-sm transition"
          >
            <ChevronLeft size={24} />
          </button>
          <button
            onClick={handleNext}
            className="absolute right-0 top-1/2 -translate-y-1/2 p-3 bg-white/5 hover:bg-white/20 rounded-full backdrop-blur-sm transition"
          >
            <ChevronRight size={24} />
          </button>
        </div>
      </div>
    </section>
  );
};

export default Testimonials;
