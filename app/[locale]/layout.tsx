import type { Metadata } from "next";
import { NextIntlClientProvider } from "next-intl";
import { getTranslations } from "next-intl/server";
import { RouteAnnouncer } from "@/components/ui/RouteAnnouncer";
import { fontVariables } from "@/lib/fonts";
import { resolveLocale } from "@/lib/i18n/locale";
import { directionOf, routing } from "@/lib/i18n/routing";
import { isProductionSite, siteUrl } from "@/lib/seo/site";
import "../globals.css";

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

export async function generateMetadata({
  params,
}: LayoutProps<"/[locale]">): Promise<Metadata> {
  const locale = resolveLocale((await params).locale);
  const t = await getTranslations({ locale, namespace: "Metadata" });
  return {
    // Set here, not only per page: file-based metadata images (opengraph-image) resolve their absolute URL
    // against the layout's metadataBase.
    metadataBase: new URL(siteUrl()),
    title: { default: t("siteName"), template: `%s | ${t("siteName")}` },
    description: t("description"),
    robots: isProductionSite() ? undefined : { index: false, follow: false },
  };
}

// Root layout: lang + dir per locale, skip link first, one <main>, route-change focus + announcer (CLAUDE.md §4, §7).
export default async function LocaleLayout({
  children,
  params,
}: LayoutProps<"/[locale]">) {
  const locale = resolveLocale((await params).locale);
  const t = await getTranslations({ locale, namespace: "Layout" });

  return (
    <html
      lang={locale}
      dir={directionOf(locale)}
      className={fontVariables || undefined}
    >
      <body>
        <a
          href="#main"
          className="focus:bg-brand focus:text-on-brand sr-only focus-ring focus:not-sr-only focus:fixed focus:start-4 focus:top-4 focus:z-50 focus:rounded-md focus:px-4 focus:py-2"
        >
          {t("skipToContent")}
        </a>
        <NextIntlClientProvider>
          <main id="main" tabIndex={-1}>
            {children}
          </main>
          <RouteAnnouncer />
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
