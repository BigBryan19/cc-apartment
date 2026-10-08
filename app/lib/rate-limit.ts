// app/lib/rate-limit.ts
// ---------------------------------------------------------------------------
// A small fixed-window rate limiter for the public API routes.
//
// WHY THIS EXISTS
//   /api/payments/paystack/verify is an unauthenticated GET that calls Paystack,
//   mutates a booking and sends an email. /api/bookings/request writes with the
//   service-role key, which bypasses RLS by design — so row-level security
//   cannot stop a loop. Neither route had any throttle at all.
//
// SCOPE / LIMITATIONS — read before relying on this
//   This is an in-process Map. It works because the site runs as a single
//   Vercel function region, but it is NOT shared between concurrent instances:
//   a burst that lands on ten cold starts gets ten windows. It is a speed bump,
//   not a wall. Pair it with Vercel Firewall rate-limiting rules (which run at
//   the edge, before the function is invoked or billed) for the real limit.
//
//   If you later move to multiple regions or want a hard guarantee, swap the
//   Map for Upstash Redis. The `rateLimit()` signature is designed to survive
//   that swap unchanged.
// ---------------------------------------------------------------------------

import "server-only";

interface Bucket {
  count: number;
  resetAt: number;
}

const buckets = new Map<string, Bucket>();

/** Stop the Map growing without bound when traffic is spread across many IPs. */
const SWEEP_INTERVAL_MS = 60_000;

if (typeof setInterval !== "undefined") {
  const timer = setInterval(() => {
    const now = Date.now();
    for (const [key, bucket] of buckets) {
      if (now > bucket.resetAt) buckets.delete(key);
    }
  }, SWEEP_INTERVAL_MS);

  // Do not hold the process open for the sake of housekeeping.
  timer.unref?.();
}

export interface RateLimitResult {
  ok: boolean;
  remaining: number;
  /** Seconds until the window resets. Only meaningful when `ok` is false. */
  retryAfter: number;
}

/**
 * Consume one unit from `key`'s window.
 *
 * @param key      Usually `"<route>:<ip>"`.
 * @param limit    Requests permitted per window.
 * @param windowMs Window length in milliseconds.
 */
export function rateLimit(key: string, limit: number, windowMs: number): RateLimitResult {
  const now = Date.now();
  const bucket = buckets.get(key);

  if (!bucket || now >= bucket.resetAt) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return { ok: true, remaining: limit - 1, retryAfter: 0 };
  }

  if (bucket.count >= limit) {
    return {
      ok: false,
      remaining: 0,
      retryAfter: Math.max(1, Math.ceil((bucket.resetAt - now) / 1000)),
    };
  }

  bucket.count += 1;
  return { ok: true, remaining: limit - bucket.count, retryAfter: 0 };
}

/**
 * Best-effort client identifier.
 *
 * Vercel sets `x-real-ip` on every request; `x-forwarded-for` is the fallback.
 * Both are attacker-controlled in principle, so this is only used as a bucket
 * *key*, never for an authorisation decision — a spoofed value costs an
 * attacker nothing but also gains them nothing beyond a fresh bucket.
 */
export function clientKey(request: Request, scope: string): string {
  const realIp = request.headers.get("x-real-ip");
  if (realIp) return `${scope}:${realIp}`;

  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) {
    const first = forwarded.split(",")[0]?.trim();
    if (first) return `${scope}:${first}`;
  }

  return `${scope}:unknown`;
}
