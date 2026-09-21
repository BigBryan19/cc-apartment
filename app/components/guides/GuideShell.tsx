// app/components/guides/GuideShell.tsx
"use client";

// ---------------------------------------------------------------------------
// Page chrome for the guides.
//
// This is a client component only because the navbar owns the currency toggle.
// Its `children` are passed down from a server component, which means the
// article markup itself is still rendered on the server and present in the
// initial HTML — exactly what a crawler needs. Do not move the article body
// inside this component, or it would become client-rendered.
// ---------------------------------------------------------------------------

import React, { useState, useEffect } from "react";
import Navbar from "../Navbar";
import Footer from "../Footer";

export default function GuideShell({
  children,
}: {
  children: React.ReactNode;
}) {
  const [currency, setCurrency] = useState<"GHS" | "USD">("GHS");

  useEffect(() => {
    const saved = window.localStorage.getItem("cc-currency");
    if (saved === "GHS" || saved === "USD") setCurrency(saved);
  }, []);

  const toggleCurrency = () => {
    setCurrency((current) => {
      const next = current === "GHS" ? "USD" : "GHS";
      window.localStorage.setItem("cc-currency", next);
      return next;
    });
  };

  return (
    <div className="min-h-screen bg-white font-sans text-[var(--color-ink)]">
      {/* `solid` because there is no dark hero behind the navbar here. */}
      <Navbar
        currency={currency}
        toggleCurrency={toggleCurrency}
        variant="solid"
      />
      {children}
      <Footer />
    </div>
  );
}
