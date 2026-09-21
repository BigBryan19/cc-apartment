// app/components/FAQ.tsx
"use client";

import React, { useState } from "react";
import { Plus, Minus } from "lucide-react";
// Shared with app/lib/seo.ts, which turns the same array into FAQPage
// structured data. One copy, so the page and the markup cannot disagree.
import { FAQS } from "../lib/content";

const FAQ: React.FC = () => {
  const [openIndex, setOpenIndex] = useState<number | null>(0);

  return (
    <section id="faq" className="section-y bg-[var(--color-canvas)]">
      <div className="shell max-w-3xl">
        <div className="text-center">
          <span className="eyebrow">Good to know</span>
          <h2 className="mt-2 text-3xl font-semibold tracking-tight text-[var(--color-ink)] sm:text-4xl">
            Frequently asked questions
          </h2>
        </div>

        <div className="mt-10 divide-y divide-[var(--color-line)] border-y border-[var(--color-line)]">
          {FAQS.map((faq, index) => {
            const isOpen = openIndex === index;
            return (
              <div key={faq.question}>
                <h3>
                  <button
                    onClick={() => setOpenIndex(isOpen ? null : index)}
                    aria-expanded={isOpen}
                    className="flex w-full items-center justify-between gap-6 py-5 text-left"
                  >
                    <span className="text-[15px] font-semibold text-[var(--color-ink)]">
                      {faq.question}
                    </span>
                    <span className="shrink-0 text-[var(--color-muted)]">
                      {isOpen ? <Minus size={18} /> : <Plus size={18} />}
                    </span>
                  </button>
                </h3>

                <div
                  className={`grid transition-all duration-300 ease-in-out ${
                    isOpen ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"
                  }`}
                >
                  <div className="overflow-hidden">
                    <p className="pb-6 pr-10 text-sm leading-relaxed text-[var(--color-muted)]">
                      {faq.answer}
                    </p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
};

export default FAQ;
