import type { MetadataRoute } from "next";
import { routing } from "@/lib/i18n/routing";
import { siteUrl } from "@/lib/seo/site";

// Every locale, with hreflang alternates. As content routes are built, add their URLs here from the live API
// (via getPublic in lib/api) — never from a hand-kept list (CLAUDE.md §1).
const STATIC_PATHS = ["/"];

const localized = (locale: string, path: string) =>
  `${siteUrl()}/${locale}${path === "/" ? "" : path}`;

export default function sitemap(): MetadataRoute.Sitemap {
  return STATIC_PATHS.flatMap((path) =>
    routing.locales.map((locale) => ({
      url: localized(locale, path),
      alternates: {
        languages: Object.fromEntries(
          routing.locales.map((l) => [l, localized(l, path)]),
        ),
      },
    })),
  );
}
