"use client";

import { useEffect } from "react";
import { isLiteDevice } from "./lite";

/**
 * Smooth, slightly eased scrolling (Lenis), as on the reference site, driven by GSAP's ticker so ScrollTrigger
 * and Lenis stay in step. Desktop only: off in lite mode (phones, tablets — native scrolling, and Lenis and GSAP
 * aren't downloaded) and when the visitor prefers reduced motion. Keyboard scrolling, anchor links and focus
 * still work: Lenis follows the native scroll position.
 */
export function SmoothScroll() {
  useEffect(() => {
    if (
      isLiteDevice() ||
      window.matchMedia("(prefers-reduced-motion: reduce)").matches
    )
      return;
    let cancelled = false;
    let teardown: (() => void) | undefined;
    void Promise.all([import("lenis"), import("./motion")]).then(
      ([{ default: Lenis }, { gsap, ScrollTrigger, setLenis }]) => {
        if (cancelled) return;
        const lenis = new Lenis({ anchors: true, autoRaf: false });
        setLenis(lenis);
        lenis.on("scroll", ScrollTrigger.update);
        const tick = (time: number) => lenis.raf(time * 1000);
        gsap.ticker.add(tick);
        gsap.ticker.lagSmoothing(0);
        teardown = () => {
          gsap.ticker.remove(tick);
          lenis.destroy();
          setLenis(null);
        };
      },
    );
    return () => {
      cancelled = true;
      teardown?.();
    };
  }, []);

  return null;
}
