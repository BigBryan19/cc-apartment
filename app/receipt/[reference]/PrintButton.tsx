"use client";

// Floating action for the printable receipt. Hidden when printing so it never
// ends up on the saved PDF.

import React from "react";
import { Printer, ArrowLeft } from "lucide-react";

export default function PrintButton() {
  return (
    <div className="fixed inset-x-0 bottom-0 z-50 flex justify-center p-4 print:hidden">
      <div className="flex items-center gap-3 rounded-full border border-[var(--color-line)] bg-white/95 px-3 py-2 shadow-[var(--shadow-card)] backdrop-blur">
        <button
          onClick={() => window.close()}
          className="inline-flex items-center gap-1.5 rounded-full px-3 py-2 text-xs font-semibold text-[var(--color-muted)] transition-colors hover:text-[var(--color-ink)]"
        >
          <ArrowLeft size={14} /> Close
        </button>
        <button
          onClick={() => window.print()}
          className="btn-accent inline-flex items-center gap-2 rounded-full px-4 py-2.5 text-xs"
        >
          <Printer size={14} /> Print or save as PDF
        </button>
      </div>
    </div>
  );
}
