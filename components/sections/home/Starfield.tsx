"use client";

import { useEffect, useRef } from "react";

/** Deterministic pseudo-random numbers, so the sky looks the same on every render. */
function random(seed: number) {
  let s = seed;
  return () => {
    s = (s * 16807) % 2147483647;
    return (s - 1) / 2147483646;
  };
}

/**
 * Static star dust on a 2D canvas — drawn once per size or theme change, never animated (the motion comes from
 * the scroll and the drifting dust in HeroStage). Star colour follows --color-text-muted, so it suits both themes.
 */
export function Starfield({ className }: { className?: string }) {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = ref.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;

    const draw = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const { clientWidth: w, clientHeight: h } = canvas;
      canvas.width = Math.round(w * dpr);
      canvas.height = Math.round(h * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, w, h);
      ctx.fillStyle = getComputedStyle(canvas)
        .getPropertyValue("--color-text-muted")
        .trim();
      const next = random(7);
      const count = Math.round((w * h) / 900);
      for (let i = 0; i < count; i++) {
        const size = next() < 0.92 ? 0.6 + next() * 0.6 : 1.2 + next() * 0.9;
        ctx.globalAlpha = 0.35 + next() * 0.65;
        ctx.fillRect(next() * w, next() * h, size, size);
      }
      ctx.globalAlpha = 1;
    };

    const sizeObserver = new ResizeObserver(draw);
    sizeObserver.observe(canvas);
    const themeObserver = new MutationObserver(draw);
    themeObserver.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["data-theme"],
    });
    const scheme = window.matchMedia("(prefers-color-scheme: light)");
    scheme.addEventListener("change", draw);
    draw();
    return () => {
      sizeObserver.disconnect();
      themeObserver.disconnect();
      scheme.removeEventListener("change", draw);
    };
  }, []);

  return <canvas ref={ref} aria-hidden="true" className={className} />;
}
