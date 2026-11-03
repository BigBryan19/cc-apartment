"use client";

// app/components/ThemeProvider.tsx
// ---------------------------------------------------------------------------
// Carries the owner's brand settings from the server layout to client
// components, so a button label or a WhatsApp number is not hard-coded in a
// component that cannot read the database.
//
// The values arrive from app/layout.tsx, which reads them once per request. A
// missing row yields the approved defaults, so nothing here is ever undefined.
// ---------------------------------------------------------------------------

import React, { createContext, useContext } from "react";
import { DEFAULT_THEME, type ThemeSettings } from "../lib/theme";

const ThemeContext = createContext<ThemeSettings>(DEFAULT_THEME);

export function ThemeProvider({
  theme,
  children,
}: {
  theme: ThemeSettings;
  children: React.ReactNode;
}) {
  return <ThemeContext.Provider value={theme}>{children}</ThemeContext.Provider>;
}

export function useSiteTheme(): ThemeSettings {
  return useContext(ThemeContext);
}
