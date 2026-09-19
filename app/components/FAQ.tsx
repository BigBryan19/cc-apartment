// app/components/FAQ.tsx
"use client";

import React, { useState } from "react";
import { Plus, Minus } from "lucide-react";

const FAQ: React.FC = () => {
  const [openIndex, setOpenIndex] = useState<number | null>(0);

  const faqs = [
    {
      question: "What are the check-in and check-out times?",
      answer:
        "Standard check-in is at 2:00 PM, and check-out is at 11:00 AM. Early check-in or late check-out can be arranged upon request, subject to availability.",
    },
    {
      question: "Are pets allowed in the apartments?",
      answer:
        "Yes, select properties like our Aburi Mountain Retreat are pet-friendly! Please inform us during booking so we can prepare accordingly.",
    },
    {
      question: "Is security guaranteed at the properties?",
      answer:
        "Absolutely. All properties are equipped with 24/7 security personnel, CCTV surveillance, and secure parking to ensure maximum safety",
    },
    {
      question: "How do the special packages (Birthday/Honeymoon) work?",
      answer:
        "Once you select a package during checkout or via WhatsApp, our concierge team will reach out to discuss your exact preferences, themes, and arrange everything before your arrival.",
    },
    {
      question: "Can I cancel or modify my reservation?",
      answer:
        "Yes, reservations can be modified or canceled up to 48 hours before check-in for a full refund. Please review our full terms and conditions for extended stays.",
    },
  ];

  const toggleFAQ = (index: number) => {
    setOpenIndex(openIndex === index ? null : index);
  };

  return (
    <section className="py-24 bg-white px-4 md:px-12" id="faq">
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-16">
          <p className="text-[10px] font-bold tracking-[0.2em] text-blue-500 uppercase mb-4">
            Got Questions?
          </p>
          <h2 className="text-4xl md:text-5xl font-serif text-slate-900 mb-6">
            Frequently Asked Questions
          </h2>
        </div>

        <div className="space-y-4">
          {faqs.map((faq, index) => {
            const isOpen = openIndex === index;
            return (
              <div
                key={index}
                className={`border rounded-2xl transition-all duration-300 ${isOpen ? "border-blue-500 bg-blue-50/30 shadow-md" : "border-slate-200 bg-white hover:border-slate-300"}`}
              >
                <button
                  onClick={() => toggleFAQ(index)}
                  className="flex justify-between items-center w-full p-6 text-left"
                >
                  <span className="font-serif text-lg text-slate-900">
                    {faq.question}
                  </span>
                  <div
                    className={`p-2 rounded-full transition-colors ${isOpen ? "bg-blue-600 text-white" : "bg-slate-100 text-slate-500"}`}
                  >
                    {isOpen ? <Minus size={16} /> : <Plus size={16} />}
                  </div>
                </button>
                <div
                  className={`grid transition-all duration-300 ease-in-out ${isOpen ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"}`}
                >
                  <div className="overflow-hidden">
                    <p className="p-6 pt-0 text-slate-600 text-sm leading-relaxed">
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
