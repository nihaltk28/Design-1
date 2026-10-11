import type { Metadata } from "next";
import { routing, type Locale } from "@/lib/i18n/routing";
import { isProductionSite, siteUrl } from "./site";

type PageMetadataInput = {
  locale: Locale;
  /** Path without the locale prefix, e.g. "/" or "/news/my-slug". */
  path: string;
  title: string;
  description?: string;
};

const localizedPath = (locale: string, path: string) =>
  `/${locale}${path === "/" ? "" : path}`;

/** Canonical, hreflang (+ x-default), Open Graph and robots for one page — titles come from API content. */
export function buildMetadata({
  locale,
  path,
  title,
  description,
}: PageMetadataInput): Metadata {
  const languages = Object.fromEntries(
    routing.locales.map((l) => [l, localizedPath(l, path)]),
  );

  return {
    metadataBase: new URL(siteUrl()),
    title,
    description,
    alternates: {
      canonical: localizedPath(locale, path),
      languages: {
        ...languages,
        "x-default": localizedPath(routing.defaultLocale, path),
      },
    },
    openGraph: {
      title,
      description,
      locale,
      url: localizedPath(locale, path),
      type: "website",
    },
    robots: isProductionSite() ? undefined : { index: false, follow: false },
  };
}
