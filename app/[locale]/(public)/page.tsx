import type { Metadata } from "next";
import type { WebSite } from "schema-dts";
import { getTranslations } from "next-intl/server";
import { Container } from "@/components/ui/Container";
import { getSiteSettings } from "@/lib/api/site-settings";
import { resolveLocale } from "@/lib/i18n/locale";
import type { Locale } from "@/lib/i18n/routing";
import { JsonLd } from "@/lib/seo/JsonLd";
import { buildMetadata } from "@/lib/seo/metadata";
import { siteUrl } from "@/lib/seo/site";

// Scaffold home page: proves token → component → route → getPublic → MSW in every locale.
// Replace with the real home template once its row is in the CLAUDE.md §2 route table.

/** Settings, or null if the API fails — the page still renders (CLAUDE.md §2: every call has a fallback). */
async function loadSettings(locale: Locale) {
  try {
    return await getSiteSettings(locale);
  } catch (error) {
    console.error("[home] site settings unavailable", error);
    return null;
  }
}

export async function generateMetadata({
  params,
}: PageProps<"/[locale]">): Promise<Metadata> {
  const locale = resolveLocale((await params).locale);
  const settings = await loadSettings(locale);
  const t = await getTranslations({ locale, namespace: "Metadata" });
  return buildMetadata({
    locale,
    path: "/",
    title: settings?.siteName ?? t("siteName"),
    description: settings?.tagline || t("description"),
  });
}

export default async function HomePage({ params }: PageProps<"/[locale]">) {
  const locale = resolveLocale((await params).locale);
  const [settings, t] = await Promise.all([
    loadSettings(locale),
    getTranslations({ locale, namespace: "Home" }),
  ]);

  return (
    <Container className="py-(--spacing-section-y)">
      <h1 className="text-3xl font-bold">
        {settings?.siteName ?? t("fallbackTitle")}
      </h1>
      {settings?.tagline ? (
        <p className="mt-4 text-lg text-text-muted">{settings.tagline}</p>
      ) : null}
      <JsonLd<WebSite>
        data={{
          "@context": "https://schema.org",
          "@type": "WebSite",
          name: settings?.siteName ?? t("fallbackTitle"),
          url: `${siteUrl()}/${locale}`,
          inLanguage: locale,
        }}
      />
    </Container>
  );
}
