#!/usr/bin/env node
// Fluid token generator (CLAUDE.md §7 Responsive). Paste the output into styles/tokens.css.
//
//   pnpm token:clamp <minPx> <maxPx> <minViewportPx> <maxViewportPx> [--name=--text-nav-item]
//   pnpm token:clamp 14 18 1400 1920 --name=--text-nav-item
//   → --text-nav-item: clamp(0.875rem, 0.2019rem + 0.7692vw, 1.125rem); /* 14px @1400 → 18px @1920 */
//
// Bounds are in rem so the value still follows the user's browser font size (WCAG 1.4.4 resize text).

const ROOT_PX = 16;

const args = process.argv.slice(2);
const name = args.find((a) => a.startsWith("--name="))?.slice("--name=".length);
const nums = args.filter((a) => !a.startsWith("--")).map(Number);

if (nums.length !== 4 || nums.some((n) => !Number.isFinite(n))) {
  console.error("Usage: pnpm token:clamp <minPx> <maxPx> <minViewportPx> <maxViewportPx> [--name=--token-name]");
  process.exit(1);
}

const [minPx, maxPx, vMin, vMax] = nums;
if (vMax <= vMin) {
  console.error("maxViewportPx must be greater than minViewportPx.");
  process.exit(1);
}

const round = (n) => Number(n.toFixed(4));
const rem = (px) => `${round(px / ROOT_PX)}rem`;

const slope = (maxPx - minPx) / (vMax - vMin);
const interceptPx = minPx - slope * vMin;
const lower = Math.min(minPx, maxPx); // a shrinking value (max < min) still needs clamp(low, …, high)
const upper = Math.max(minPx, maxPx);

const vw = round(slope * 100);
const preferred = `${rem(interceptPx)} ${vw < 0 ? "-" : "+"} ${Math.abs(vw)}vw`;
const value = `clamp(${rem(lower)}, ${preferred}, ${rem(upper)})`;
const comment = `/* ${minPx}px @${vMin} → ${maxPx}px @${vMax} */`;

console.log(name ? `${name}: ${value}; ${comment}` : `${value}; ${comment}`);
