// app/components/FloatingWhatsApp.tsx
"use client";

import React from "react";
import { MessageCircle } from "lucide-react";

const FloatingWhatsApp: React.FC = () => {
  const handleChat = () => {
    const phoneNumber = "2330540534870";
    const message = "Hello Cosy Crest! I have a question regarding a booking.";
    const whatsappUrl = `https://wa.me/${phoneNumber}?text=${encodeURIComponent(message)}`;
    window.open(whatsappUrl, "_blank");
  };

  return (
    <div className="fixed bottom-6 right-6 z-[100]">
      {/* Outer pulsing ring */}
      <div className="absolute inset-0 bg-green-500 rounded-full animate-ping opacity-75 duration-1000"></div>

      {/* Main Button */}
      <button
        onClick={handleChat}
        className="relative flex items-center justify-center w-14 h-14 bg-green-500 text-white rounded-full shadow-2xl hover:scale-110 transition-transform duration-300"
        aria-label="Chat with us on WhatsApp"
      >
        <MessageCircle size={28} />
      </button>
    </div>
  );
};

export default FloatingWhatsApp;
