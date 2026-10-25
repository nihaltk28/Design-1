// @vitest-environment node
import { readFileSync } from "node:fs";
import path from "node:path";
import { expect, test } from "vitest";
import { CUSTOM_TEXT_SIZES, cn } from "./cn";

test("a custom text size and a text colour both survive", () => {
  expect(cn("mono-label text-micro", "text-text-muted")).toBe(
    "mono-label text-micro text-text-muted",
  );
  expect(cn("text-label text-accent-text")).toBe("text-label text-accent-text");
});

test("two text sizes still merge (the later one wins)", () => {
  expect(cn("text-micro", "text-label")).toBe("text-label");
});

test("every --text-* size token in tokens.css is known to cn()", () => {
  const css = readFileSync(
    path.join(process.cwd(), "styles/tokens.css"),
    "utf8",
  );
  // Names may contain single hyphens ("card-title"); "--line-height" variants have a double one and don't match.
  const sizes = [...css.matchAll(/--text-([a-z0-9]+(?:-[a-z0-9]+)*)\s*:/g)].map(
    ([, name]) => name,
  );
  const defaults = ["xs", "sm", "base", "lg", "xl", "2xl", "3xl"];
  for (const size of sizes.filter((name) => !defaults.includes(name)))
    expect(CUSTOM_TEXT_SIZES, `add "${size}" to CUSTOM_TEXT_SIZES`).toContain(
      size,
    );
});
