// app/components/FloatingWhatsApp.tsx
"use client";

import React from "react";
import { MessageCircle } from "lucide-react";

const FloatingWhatsApp: React.FC = () => {
  const handleChat = () => {
    const message = "Hello Cosy Crest! I have a question regarding a booking.";
    window.open(
      `https://wa.me/2330540534870?text=${encodeURIComponent(message)}`,
      "_blank",
    );
  };

  return (
    <button
      onClick={handleChat}
      aria-label="Chat with us on WhatsApp"
      className="group fixed bottom-5 right-5 z-[100] flex items-center gap-0 rounded-full bg-[#25D366] py-3.5 pl-3.5 pr-3.5 text-white shadow-[var(--shadow-card)] transition-all duration-300 hover:gap-2.5 hover:pr-5 md:bottom-7 md:right-7"
    >
      <MessageCircle size={24} className="shrink-0" />
      {/* Label revealed on hover so the button stays unobtrusive at rest. */}
      <span className="max-w-0 overflow-hidden whitespace-nowrap text-sm font-semibold opacity-0 transition-all duration-300 group-hover:max-w-[9rem] group-hover:opacity-100">
        Chat with us
      </span>
    </button>
  );
};

export default FloatingWhatsApp;
