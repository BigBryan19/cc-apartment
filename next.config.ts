import type { NextConfig } from "next";

/**
 * Host of the Supabase project, derived from the public URL so the CSP does not
 * have to be edited when the project is re-provisioned. Falls back to the
 * wildcard suffix when the variable is absent (local builds, CI).
 */
const supabaseHost = process.env.NEXT_PUBLIC_SUPABASE_URL
  ? new URL(process.env.NEXT_PUBLIC_SUPABASE_URL).host
  : "*.supabase.co";

const isDev = process.env.NODE_ENV === "development";

/**
 * Content Security Policy.
 *
 * `script-src` needs 'unsafe-inline' because Next.js injects inline bootstrap
 * and hydration scripts. Removing it requires wiring a per-request nonce through
 * middleware — a worthwhile follow-up, but 'unsafe-inline' alone still closes the
 * framing, sniffing and object-embedding holes, which is the bulk of the risk
 * here (the admin panel edits prices and availability).
 *
 * 'unsafe-eval' is development-only; React's dev overlay and webpack's eval
 * source maps need it. It is never sent in a production response.
 *
 * IMAGE HOSTS — every one of these is load-bearing. A missing entry does not
 * error, it silently blanks the resource, so add to this list whenever a new
 * third-party image source is introduced:
 *   • *.supabase.co / .in  — villa imagery in Supabase Storage
 *   • *.basemaps.cartocdn.com — CARTO raster tiles for the Leaflet map on the
 *     property pages. Omit it and the map renders as an empty grey rectangle.
 *   • unpkg.com — Leaflet's default marker icons, which VillaMapView points at
 *     unpkg directly (see the L.Icon.Default.mergeOptions call there).
 *   • images.unsplash.com — the stock photography in Regions.tsx and
 *     Packages.tsx. These should eventually move to /public or Supabase Storage,
 *     since a third-party CDN in the critical path is its own liability.
 *
 * wa.me links (WhatsApp), mailto: links and external <a href>s are not resource
 * loads and are unaffected by this policy.
 */
/**
 * Join tokens into one directive, dropping duplicates and empties.
 *
 * Needed because the derived Supabase host is itself the wildcard
 * (`xxx.supabase.co` matched against `*.supabase.co`) when
 * NEXT_PUBLIC_SUPABASE_URL is unset at build time — without this the header
 * ships the same origin twice.
 */
const unique = (...items: (string | false)[]) =>
  [...new Set(items.filter((item): item is string => Boolean(item)))].join(" ");

const csp = [
  "default-src 'self'",
  unique(
    "script-src 'self' 'unsafe-inline'",
    "https://js.paystack.co",
    isDev && "'unsafe-eval'",
  ),
  "style-src 'self' 'unsafe-inline'",
  unique(
    "img-src 'self' data: blob:",
    `https://${supabaseHost}`,
    "https://*.supabase.co",
    "https://*.supabase.in",
    "https://*.basemaps.cartocdn.com",
    "https://unpkg.com",
    "https://images.unsplash.com",
  ),
  "font-src 'self' data:",
  unique(
    "connect-src 'self'",
    `https://${supabaseHost}`,
    "https://*.supabase.co",
    "https://*.supabase.in",
    "https://api.paystack.co",
    // Leaflet fetches nothing over XHR for raster tiles, but keep the tile host
    // available in case the map is later switched to a vector/style source.
    "https://*.basemaps.cartocdn.com",
    isDev && "ws: wss:",
  ),
  "frame-src https://checkout.paystack.com https://*.paystack.co",
  "frame-ancestors 'none'",
  "base-uri 'self'",
  "form-action 'self' https://checkout.paystack.com",
  "object-src 'none'",
  "upgrade-insecure-requests",
].join("; ");

const securityHeaders = [
  { key: "Content-Security-Policy", value: csp },
  // Redundant alongside frame-ancestors, but X-Frame-Options is still what older
  // browsers and a few corporate proxies honour.
  { key: "X-Frame-Options", value: "DENY" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  {
    key: "Permissions-Policy",
    // `payment=(self)` keeps the Payment Request API on-origin; nothing on the
    // site needs camera, microphone or location.
    value: "camera=(), microphone=(), geolocation=(), payment=(self)",
  },
  { key: "Cross-Origin-Opener-Policy", value: "same-origin" },
];

/** One year. Content-hashed filenames, so a change always produces a new URL. */
const immutableCache = [
  { key: "Cache-Control", value: "public, max-age=31536000, immutable" },
];

/** A week, with a long stale-while-revalidate tail. */
const assetCache = [
  {
    key: "Cache-Control",
    value: "public, max-age=604800, stale-while-revalidate=86400",
  },
];

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

  async headers() {
    return [
      {
        // Everything, including API routes and static files under /public.
        source: "/:path*",
        headers: securityHeaders,
      },
      {
        source: "/_next/static/:path*",
        headers: immutableCache,
      },
      {
        // /public assets are not content-hashed, so a week rather than a year —
        // short enough that replacing an image in place takes effect reasonably
        // quickly, long enough that repeat visits are free.
        //
        // NOTE: these match by extension, so an image referenced by a *dynamic*
        // route (e.g. /_next/image?url=...) is unaffected and keeps its own
        // optimiser caching.
        source: "/:file*.jpg",
        headers: assetCache,
      },
      {
        source: "/:file*.jpeg",
        headers: assetCache,
      },
      {
        source: "/:file*.png",
        headers: assetCache,
      },
      {
        source: "/:file*.webp",
        headers: assetCache,
      },
      {
        // Defence in depth behind middleware.ts: never let the admin surface be
        // framed or cached, even if the middleware gate is ever misconfigured.
        source: "/admin/:path*",
        headers: [
          { key: "X-Frame-Options", value: "DENY" },
          { key: "Cache-Control", value: "no-store, max-age=0" },
        ],
      },
    ];
  },
};

export default nextConfig;
