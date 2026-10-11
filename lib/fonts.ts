// Self-hosted fonts (CLAUDE.md §5, §7 Fonts). The locale layout applies `fontVariables` on <html>,
// so nothing changes there when the real fonts land.
//
// When the brand fonts arrive (woff2, subset, only the weights the design uses), replace the export below:
//
//   import localFont from "next/font/local";
//
//   const brand = localFont({
//     src: [
//       { path: "../public/fonts/brand-regular.woff2", weight: "400", style: "normal" },
//       { path: "../public/fonts/brand-bold.woff2", weight: "700", style: "normal" },
//     ],
//     variable: "--font-brand-local",
//     display: "swap",
//   });
//
//   export const fontVariables = brand.variable;
//
// tokens.css already bridges it: --font-brand: var(--font-brand-local, system-ui), system-ui, sans-serif;

export const fontVariables = "";
