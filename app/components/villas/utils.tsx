import React from "react";
import { Wifi, Utensils, Waves, Sofa, Tv, CheckCircle } from "lucide-react";

export const EXCHANGE_RATE = 15; // 1 USD = 15 GHS

export const getAmenityIcon = (text: string) => {
  const lower = text.toLowerCase();
  const iconClass = "w-5 h-5 mx-auto mb-2 text-slate-500";

  if (lower.includes("wi-fi") || lower.includes("wifi"))
    return <Wifi className={iconClass} />;
  if (lower.includes("kitchen")) return <Utensils className={iconClass} />;
  if (lower.includes("pool")) return <Waves className={iconClass} />;
  if (lower.includes("hall") || lower.includes("furnished"))
    return <Sofa className={iconClass} />;
  if (lower.includes("television") || lower.includes("tv"))
    return <Tv className={iconClass} />;

  return <CheckCircle className={iconClass} />;
};

export const formatPrice = (amount: number, currency: "GHS" | "USD") => {
  if (currency === "GHS") {
    return `₵${amount.toLocaleString()}`;
  } else {
    const usdAmount = Math.round(amount / EXCHANGE_RATE);
    return `$${usdAmount.toLocaleString()}`;
  }
};
