// @vitest-environment node
import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, test } from "vitest";
import { OG_COLORS, OG_COLOR_TOKENS } from "./og-colors";

// The share image's colours must match the dark-theme tokens (styles/tokens.css) exactly.
const tokens = new Map(
  [
    ...readFileSync(path.join(process.cwd(), "styles/tokens.css"), "utf8")
      .replace(/\/\*[\s\S]*?\*\//g, "")
      .matchAll(/(--[\w-]+)\s*:\s*([^;]+);/g),
  ].map(([, name, value]) => [name, value.trim().toLowerCase()] as const),
);

describe("share-image colours mirror tokens.css", () => {
  test.each(Object.entries(OG_COLOR_TOKENS))("%s = %s", (key, token) => {
    expect(tokens.get(token)).toBe(
      OG_COLORS[key as keyof typeof OG_COLORS].toLowerCase(),
    );
  });
});
