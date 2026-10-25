"use client";

import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import type Lenis from "lenis";

// One place that sets up GSAP for the home page's scroll journey (CLAUDE.md §5: each library imported once).
// Only client components import this file, so GSAP never reaches the server bundle.
gsap.registerPlugin(ScrollTrigger);

let lenis: Lenis | null = null;

/** The running smooth-scroll instance, if any (none with reduced motion). Set by SmoothScroll. */
export const getLenis = () => lenis;
export const setLenis = (instance: Lenis | null) => {
  lenis = instance;
};

/** Scroll to a page position — smoothly through Lenis when it's running, otherwise natively. */
export function scrollToY(y: number) {
  if (lenis) lenis.scrollTo(y);
  else window.scrollTo({ top: y });
}

export const prefersReducedMotion = () =>
  window.matchMedia("(prefers-reduced-motion: reduce)").matches;

export { gsap, ScrollTrigger };
