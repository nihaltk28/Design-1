// @vitest-environment node
// lib/security: constant-time secret check and the rate limiter (CLAUDE.md §6).
import { beforeEach, describe, expect, test } from "vitest";
import { clientIp, rateLimit, resetRateLimits } from "@/lib/security/rate-limit";
import { secretMatches } from "@/lib/security/secret";

describe("secretMatches", () => {
  test("matches only the exact secret", () => {
    expect(secretMatches("s3cret-value", "s3cret-value")).toBe(true);
    expect(secretMatches("s3cret-valuE", "s3cret-value")).toBe(false);
    expect(secretMatches("s3cret", "s3cret-value")).toBe(false);
  });

  test("missing values never match — an unset secret doesn't open the door", () => {
    expect(secretMatches(null, "s3cret")).toBe(false);
    expect(secretMatches("", "s3cret")).toBe(false);
    expect(secretMatches("anything", undefined)).toBe(false);
    expect(secretMatches("", "")).toBe(false);
  });
});

describe("rateLimit", () => {
  beforeEach(() => resetRateLimits());
  const opts = { limit: 3, windowMs: 60_000 };

  test("allows up to the limit, then refuses with Retry-After", () => {
    expect(rateLimit("k", opts, 0)).toEqual({ ok: true, remaining: 2 });
    expect(rateLimit("k", opts, 1)).toEqual({ ok: true, remaining: 1 });
    expect(rateLimit("k", opts, 2)).toEqual({ ok: true, remaining: 0 });
    expect(rateLimit("k", opts, 3)).toEqual({ ok: false, retryAfterSeconds: 60 });
  });

  test("a new window starts after windowMs", () => {
    for (let i = 0; i < 3; i++) rateLimit("k", opts, 0);
    expect(rateLimit("k", opts, 60_000).ok).toBe(true);
  });

  test("keys are independent", () => {
    for (let i = 0; i < 3; i++) rateLimit("a", opts, 0);
    expect(rateLimit("a", opts, 1).ok).toBe(false);
    expect(rateLimit("b", opts, 1).ok).toBe(true);
  });
});

describe("clientIp", () => {
  test("first X-Forwarded-For entry, then X-Real-IP, then 'unknown'", () => {
    expect(clientIp(new Headers({ "x-forwarded-for": "203.0.113.7, 10.0.0.1" }))).toBe("203.0.113.7");
    expect(clientIp(new Headers({ "x-real-ip": "198.51.100.2" }))).toBe("198.51.100.2");
    expect(clientIp(new Headers())).toBe("unknown");
  });
});
