// app/components/FAQ.tsx
"use client";

import React, { useState } from "react";
import { Plus, Minus } from "lucide-react";

const FAQS = [
  {
    question: "What are the check-in and check-out times?",
    answer:
      "Standard check-in is at 2:00 PM, and check-out is at 11:00 AM. Early check-in or late check-out can be arranged upon request, subject to availability.",
  },
  {
    question: "Are pets allowed in the apartments?",
    answer:
      "Yes, select properties like our Aburi Mountain Retreat are pet-friendly. Please let us know during booking so we can prepare accordingly.",
  },
  {
    question: "Is security guaranteed at the properties?",
    answer:
      "Absolutely. All properties are equipped with 24/7 security personnel, CCTV surveillance and secure parking to ensure maximum safety.",
  },
  {
    question: "How do the special packages (birthday / honeymoon) work?",
    answer:
      "Once you select a package during checkout or via WhatsApp, our concierge team will reach out to discuss your exact preferences and themes, and arrange everything before your arrival.",
  },
  {
    question: "Can I cancel or modify my reservation?",
    answer:
      "Yes, reservations can be modified or cancelled up to 48 hours before check-in for a full refund. Please review our full terms and conditions for extended stays.",
  },
];

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
