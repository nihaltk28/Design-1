import "server-only";

// Fixed-window rate limiter (CLAUDE.md §6). IN-MEMORY = PER INSTANCE:
//   - one server / container  → this is enough
//   - several containers or serverless instances → each keeps its own counts, so the real limit is
//     limit × instances. Use the CDN / WAF rate limiting, or swap the Map for a shared store (Redis,
//     Upstash, a KV) behind the same `rateLimit()` signature. Decide per project (PROJECT-SETUP §11).

export type RateLimitResult =
  { ok: true; remaining: number } | { ok: false; retryAfterSeconds: number };

type Bucket = { count: number; resetAt: number };

const buckets = new Map<string, Bucket>();
const MAX_KEYS = 10_000;

export function rateLimit(
  key: string,
  { limit, windowMs }: { limit: number; windowMs: number },
  now: number = Date.now(),
): RateLimitResult {
  const bucket = buckets.get(key);

  if (!bucket || bucket.resetAt <= now) {
    if (buckets.size >= MAX_KEYS) prune(now);
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return { ok: true, remaining: limit - 1 };
  }

  if (bucket.count >= limit) {
    return {
      ok: false,
      retryAfterSeconds: Math.max(1, Math.ceil((bucket.resetAt - now) / 1000)),
    };
  }

  bucket.count += 1;
  return { ok: true, remaining: limit - bucket.count };
}

/** Drop expired buckets; if still full, drop the oldest so memory stays bounded. */
function prune(now: number) {
  for (const [key, bucket] of buckets)
    if (bucket.resetAt <= now) buckets.delete(key);
  while (buckets.size >= MAX_KEYS) {
    const oldest = buckets.keys().next().value;
    if (oldest === undefined) break;
    buckets.delete(oldest);
  }
}

/**
 * Client IP for rate-limit keys. Only trustworthy behind a proxy / CDN that sets these headers —
 * a client can send its own X-Forwarded-For, so the platform must overwrite it.
 */
export function clientIp(headers: Headers): string {
  return (
    headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    headers.get("x-real-ip")?.trim() ||
    "unknown"
  );
}

/** Test helper: clear all counts. */
export function resetRateLimits() {
  buckets.clear();
}
