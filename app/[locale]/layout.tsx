import type { Metadata } from "next";
import { NextIntlClientProvider } from "next-intl";
import { getTranslations } from "next-intl/server";
import { announcementScript } from "@/components/sections/site-header/announcement";
import { AnnouncementBar } from "@/components/sections/site-header/AnnouncementBar";
import { SiteHeader } from "@/components/sections/site-header/SiteHeader";
import { RouteAnnouncer } from "@/components/ui/RouteAnnouncer";
import { getSiteSettings } from "@/lib/api/site-settings";
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

// Applies the visitor's saved theme (ThemeToggle) before the first paint, so a chosen light/dark theme never
// flashes the other one. Without a saved choice the system setting applies (styles/theme-light.css).
const THEME_SCRIPT = `try{var t=localStorage.getItem("theme");if(t==="light"||t==="dark")document.documentElement.dataset.theme=t}catch(e){}`;

// Root layout: lang + dir per locale, skip link first, header, announcement bar, one <main>, route-change focus
// + announcer (CLAUDE.md §4, §7).
export default async function LocaleLayout({
  children,
  params,
}: LayoutProps<"/[locale]">) {
  const locale = resolveLocale((await params).locale);
  const [t, bar, settings] = await Promise.all([
    getTranslations({ locale, namespace: "Layout" }),
    getTranslations({ locale, namespace: "Announcement" }),
    getSiteSettings(locale).catch(() => null),
  ]);

  return (
    // The theme script sets data-theme before React hydrates, so <html> legitimately differs from the server.
    <html
      lang={locale}
      dir={directionOf(locale)}
      className={fontVariables || undefined}
      suppressHydrationWarning
    >
      <body>
        {/* Runs as the browser parses it, before anything is painted: the saved theme, and hiding the
            announcement bar if it was closed this session (no flash, no layout shift). A plain inline script on
            purpose — next/script "beforeInteractive" is queued until Next's runtime loads, which on a slow load is
            after the first paint. */}
        <script>
          {THEME_SCRIPT +
            (settings?.announcement
              ? announcementScript(settings.announcement.text)
              : "")}
        </script>
        <a
          href="#main"
          className="sr-only focus-ring focus:not-sr-only focus:fixed focus:start-4 focus:top-4 focus:z-50 focus:rounded-md focus:bg-accent focus:px-4 focus:py-2 focus:text-on-accent"
        >
          {t("skipToContent")}
        </a>
        {/* No messages are sent to the browser: every client component gets its text from the server as
            props (the provider stays for the locale-aware Link). */}
        <NextIntlClientProvider messages={null}>
          <SiteHeader />
          {settings?.announcement ? (
            <AnnouncementBar
              announcement={settings.announcement}
              labels={{ region: bar("region"), close: bar("close") }}
            />
          ) : null}
          <main id="main" tabIndex={-1}>
            {children}
          </main>
          <RouteAnnouncer />
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
