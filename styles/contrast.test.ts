// Token contrast gate (CLAUDE.md §4): 4.5:1 body text, 3:1 large text and UI boundaries (focus ring, borders
// that identify a control, indicators). A failing pair is a design issue — raise it with the designer,
// don't nudge the hex.
//
// Add a row for every foreground/background combination the design actually uses. A row naming a token that
// no longer exists fails too, so renames can't silently drop a check.
import { readFileSync } from "node:fs";
import path from "node:path";
import { parse, wcagContrast } from "culori";
import { describe, expect, test } from "vitest";

const TEXT = 4.5;
const LARGE_OR_UI = 3;

// [foreground, background, minimum ratio]
const PAIRS: [string, string, number][] = [
  ["--color-text", "--color-surface", TEXT],
  ["--color-text-muted", "--color-surface", TEXT],
  ["--color-on-brand", "--color-brand", TEXT],
  ["--color-brand", "--color-surface", LARGE_OR_UI],
  ["--color-focus-ring", "--color-surface", LARGE_OR_UI],
];

const css = readFileSync(path.join(process.cwd(), "styles/tokens.css"), "utf8").replace(/\/\*[\s\S]*?\*\//g, "");

// Last declaration wins, like the cascade (light values only — add a dark-theme table if the project has one).
const tokens = new Map([...css.matchAll(/(--[\w-]+)\s*:\s*([^;]+);/g)].map(([, name, value]) => [name, value.trim()]));

function resolve(name: string, seen = new Set<string>()): string | undefined {
  const value = tokens.get(name);
  if (value === undefined || seen.has(name)) return undefined;
  seen.add(name);
  const ref = value.match(/^var\(\s*(--[\w-]+)\s*(?:,[^)]*)?\)$/);
  return ref ? resolve(ref[1], seen) : value;
}

describe("token contrast", () => {
  test.each(PAIRS)("%s on %s ≥ %s:1", (fg, bg, min) => {
    const fgValue = resolve(fg);
    const bgValue = resolve(bg);
    expect(fgValue, `${fg} not found in tokens.css`).toBeDefined();
    expect(bgValue, `${bg} not found in tokens.css`).toBeDefined();

    const fgColor = parse(fgValue!);
    const bgColor = parse(bgValue!);
    expect(fgColor, `${fg}: "${fgValue}" is not a colour`).toBeDefined();
    expect(bgColor, `${bg}: "${bgValue}" is not a colour`).toBeDefined();
    // Semi-transparent colours depend on what's underneath — give the pair an opaque token instead.
    expect(fgColor!.alpha ?? 1, `${fg} is translucent`).toBe(1);
    expect(bgColor!.alpha ?? 1, `${bg} is translucent`).toBe(1);

    const ratio = Math.round(wcagContrast(fgColor!, bgColor!) * 100) / 100;
    expect(ratio, `${fg} (${fgValue}) on ${bg} (${bgValue})`).toBeGreaterThanOrEqual(min);
  });
});
