import { hasLocale } from "next-intl";
import { setRequestLocale } from "next-intl/server";
import { notFound } from "next/navigation";
import { routing, type Locale } from "./routing";

/** Narrow a `[locale]` route param, 404 on anything unknown, and enable static rendering for it. */
export function resolveLocale(value: string): Locale {
  if (!hasLocale(routing.locales, value)) notFound();
  setRequestLocale(value);
  return value;
}
