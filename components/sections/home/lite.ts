/**
 * Lite mode for the home page's scroll journey: phones and tablets (narrower than the 1024px desktop layout, or
 * touch-only), and very low-power machines. They get a still black hole (no WebGL), native scrolling (no Lenis),
 * CSS fade-ins and one small scroll handler — GSAP, ScrollTrigger and Lenis are never downloaded (CLAUDE.md §5:
 * LCP, TBT and INP on mid-range mobile). Decided once per page load. No GSAP import here, so checking is free.
 */
const LITE_QUERY =
  "(max-width: 1023.98px), (hover: none) and (pointer: coarse)";

export function isLiteDevice(): boolean {
  if (typeof window === "undefined") return false;
  const cores = navigator.hardwareConcurrency ?? 8;
  return window.matchMedia(LITE_QUERY).matches || cores <= 2;
}
