import type { Metadata } from "next";
import { routing, type Locale } from "@/lib/i18n/routing";
import { isProductionSite, siteUrl } from "./site";

type PageMetadataInput = {
  locale: Locale;
  /** Path without the locale prefix, e.g. "/" or "/news/my-slug". */
  path: string;
  title: string;
  description?: string;
  /**
   * Use the title as is, without the layout's "… | <site name>" suffix — for a page whose title already names
   * the site (the home page).
   */
  absoluteTitle?: boolean;
};

const localizedPath = (locale: string, path: string) =>
  `/${locale}${path === "/" ? "" : path}`;

/** Canonical, hreflang (+ x-default), Open Graph and robots for one page — titles come from API content. */
export function buildMetadata({
  locale,
  path,
  title,
  description,
  absoluteTitle = false,
}: PageMetadataInput): Metadata {
  const languages = Object.fromEntries(
    routing.locales.map((l) => [l, localizedPath(l, path)]),
  );

  return {
    metadataBase: new URL(siteUrl()),
    title: absoluteTitle ? { absolute: title } : title,
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
    // Large-image card: X uses the page's og:image (the route's opengraph-image) when it has no twitter:image.
    twitter: { card: "summary_large_image", title, description },
    robots: isProductionSite() ? undefined : { index: false, follow: false },
  };
}
