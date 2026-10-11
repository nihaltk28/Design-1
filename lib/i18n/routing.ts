import { defineRouting } from "next-intl/routing";

// Locales and the default (CLAUDE.md "Project"). Every locale needs a messages/<locale>.json with the same keys.
export const routing = defineRouting({
  locales: ["en", "ar"],
  defaultLocale: "en",
});

export type Locale = (typeof routing.locales)[number];

export const RTL_LOCALES: readonly Locale[] = ["ar"];

export function directionOf(locale: string): "ltr" | "rtl" {
  return (RTL_LOCALES as readonly string[]).includes(locale) ? "rtl" : "ltr";
}
