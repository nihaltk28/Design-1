import "server-only";
import { createHash, timingSafeEqual } from "node:crypto";

/**
 * Constant-time secret comparison (CLAUDE.md §6). A plain `===` returns faster the earlier the
 * strings differ, which lets an attacker guess a secret one character at a time. Hashing both
 * sides first gives equal-length buffers, so the length isn't leaked either.
 * Missing values never match — an unset env var must not mean "no secret required".
 */
export function secretMatches(received: string | null | undefined, expected: string | undefined): boolean {
  if (!received || !expected) return false;
  const a = createHash("sha256").update(received).digest();
  const b = createHash("sha256").update(expected).digest();
  return timingSafeEqual(a, b);
}
