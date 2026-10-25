/**
 * The black hole's still images (scripts/black-hole-posters.mjs): what lite devices show, and what desktops show
 * until the live canvas is ready. One file per theme; `sizes` matches the hole's width (--size-hole), so the
 * preload in HomeHero and the <Image> in HeroJourney ask for the same file.
 */
export const HOLE_STILLS = {
  dark: "/assets/black-hole-dark.webp",
  light: "/assets/black-hole-light.webp",
  sizes: "min(108vw, 72rem)",
} as const;
