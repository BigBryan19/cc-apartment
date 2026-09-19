import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // NOTE: `output: "export"` was removed intentionally.
  // A fully static export cannot host Route Handlers, which the Paystack
  // payment integration requires (/api/payments/paystack/*).
  // Vercel deploys this as a standard Next.js app (SSR + serverless API routes).
  reactStrictMode: true,

  images: {
    // Villa imagery is served from /public and remote Supabase storage.
    remotePatterns: [
      { protocol: "https", hostname: "**.supabase.co" },
      { protocol: "https", hostname: "**.supabase.in" },
    ],
  },
};

export default nextConfig;
