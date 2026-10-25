/**
 * Dark-theme colours for generated share images (`opengraph-image.tsx`). The image renderer (next/og) can't read
 * CSS variables, so these mirror styles/tokens.css — `og-colors.test.ts` fails if they drift. Change the token,
 * then copy the value here; never introduce a colour that isn't a token.
 */
export const OG_COLORS = {
  page: "#020b10", // --color-page
  text: "#eafcff", // --color-text
  textMuted: "#8fb3bd", // --color-text-muted
  accent: "#2dd4bf", // --color-accent
  accent2: "#38bdf8", // --color-accent-2
  orbit: "#123a44", // --color-orbit
} as const;

/** Which token each colour mirrors, for the test. */
export const OG_COLOR_TOKENS: Record<keyof typeof OG_COLORS, string> = {
  page: "--color-page",
  text: "--color-text",
  textMuted: "--color-text-muted",
  accent: "--color-accent",
  accent2: "--color-accent-2",
  orbit: "--color-orbit",
};
