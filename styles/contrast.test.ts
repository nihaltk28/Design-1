// @vitest-environment node
// Token contrast gate (CLAUDE.md §4): 4.5:1 body text, 3:1 large text and UI boundaries (focus ring, borders
// that identify a control, indicators). A failing pair is a design issue — raise it with the designer,
// don't nudge the hex.
//
// Add a row for every foreground/background combination the design actually uses. A row naming a token that
// no longer exists fails too, so renames can't silently drop a check. Both themes are checked: the dark
// default (styles/tokens.css) and the light overrides (styles/theme-light.css).
import { readFileSync } from "node:fs";
import path from "node:path";
import { parse, wcagContrast } from "culori";
import { describe, expect, test } from "vitest";

const TEXT = 4.5;
const LARGE_OR_UI = 3;

// [foreground, background, minimum ratio]
const PAIRS: [string, string, number][] = [
  // Text on the page, the header / bar surface and raised surfaces (ghost buttons, language pill)
  ["--color-text", "--color-page", TEXT],
  ["--color-text-muted", "--color-page", TEXT],
  ["--color-accent-text", "--color-page", TEXT],
  ["--color-text", "--color-surface", TEXT],
  ["--color-text-muted", "--color-surface", TEXT],
  ["--color-accent-text", "--color-surface", TEXT], // stage 5–6 links, highlighted table column
  // Gradient highlights (text-gradient) run accent-text → accent-2-text: both ends must pass
  ["--color-accent-2-text", "--color-page", TEXT],
  ["--color-accent-2-text", "--color-surface", TEXT],
  ["--color-text", "--color-surface-raised", TEXT],
  // Accent buttons
  ["--color-on-accent", "--color-accent", TEXT],
  ["--color-on-accent", "--color-accent-2", TEXT], // the solid button's gradient end
  // Control boundaries and indicators
  // (The accent *fill* is only a button background — its label carries the contrast. Lines that show a state,
  // like the active HUD marker and the headline underline, use --color-accent-text, which passes in both themes.)
  ["--color-border-strong", "--color-page", LARGE_OR_UI],
  ["--color-focus-ring", "--color-page", LARGE_OR_UI],
  ["--color-focus-ring", "--color-surface", LARGE_OR_UI],
];

const read = (file: string) =>
  readFileSync(path.join(process.cwd(), file), "utf8").replace(
    /\/\*[\s\S]*?\*\//g,
    "",
  );
const declarations = (css: string) =>
  [...css.matchAll(/(--[\w-]+)\s*:\s*([^;]+);/g)].map(
    ([, name, value]) => [name, value.trim()] as const,
  );

const dark = new Map(declarations(read("styles/tokens.css")));
// Light = the dark tokens with the light overrides on top (last declaration wins, like the cascade).
const light = new Map([
  ...dark,
  ...declarations(read("styles/theme-light.css")),
]);

function resolve(
  tokens: Map<string, string>,
  name: string,
  seen = new Set<string>(),
): string | undefined {
  const value = tokens.get(name);
  if (value === undefined || seen.has(name)) return undefined;
  seen.add(name);
  const ref = value.match(/^var\(\s*(--[\w-]+)\s*(?:,[^)]*)?\)$/);
  return ref ? resolve(tokens, ref[1], seen) : value;
}

describe.each([
  ["dark", dark],
  ["light", light],
] as const)("token contrast — %s theme", (_theme, tokens) => {
  test.each(PAIRS)("%s on %s ≥ %s:1", (fg, bg, min) => {
    const fgValue = resolve(tokens, fg);
    const bgValue = resolve(tokens, bg);
    expect(fgValue, `${fg} not found`).toBeDefined();
    expect(bgValue, `${bg} not found`).toBeDefined();

    const fgColor = parse(fgValue!);
    const bgColor = parse(bgValue!);
    expect(fgColor, `${fg}: "${fgValue}" is not a colour`).toBeDefined();
    expect(bgColor, `${bg}: "${bgValue}" is not a colour`).toBeDefined();
    // Semi-transparent colours depend on what's underneath — give the pair an opaque token instead.
    expect(fgColor!.alpha ?? 1, `${fg} is translucent`).toBe(1);
    expect(bgColor!.alpha ?? 1, `${bg} is translucent`).toBe(1);

    const ratio = Math.round(wcagContrast(fgColor!, bgColor!) * 100) / 100;
    expect(
      ratio,
      `${fg} (${fgValue}) on ${bg} (${bgValue})`,
    ).toBeGreaterThanOrEqual(min);
  });
});
