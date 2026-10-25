import localFont from "next/font/local";

// Self-hosted fonts (CLAUDE.md §5, §7 Fonts) — Latin subsets, SIL Open Font License. The locale layout applies
// `fontVariables` on <html>; tokens.css bridges them (--font-brand, --font-mono). Arabic text falls back to the
// system Arabic font until an Arabic family is chosen.

/** Inter, variable weight 100–900 — headings and body. */
const brand = localFont({
  src: "../public/fonts/inter-variable.woff2",
  weight: "100 900",
  variable: "--font-brand-local",
  display: "swap",
});

/** JetBrains Mono — the spaced, uppercase labels (eyebrows, buttons, the stage HUD). */
const mono = localFont({
  src: [
    { path: "../public/fonts/jetbrains-mono-400.woff2", weight: "400" },
    { path: "../public/fonts/jetbrains-mono-500.woff2", weight: "500" },
  ],
  variable: "--font-mono-local",
  display: "swap",
  preload: false,
});

export const fontVariables = `${brand.variable} ${mono.variable}`;
