import type { Metadata } from "next";
import type { Museum, WebSite } from "schema-dts";
import { getTranslations } from "next-intl/server";
import { HomeTemplate } from "@/components/templates/HomeTemplate";
import { getHomePage } from "@/lib/api/home";
import { getSiteSettings } from "@/lib/api/site-settings";
import { resolveLocale } from "@/lib/i18n/locale";
import { JsonLd } from "@/lib/seo/JsonLd";
import { buildMetadata } from "@/lib/seo/metadata";
import { siteUrl } from "@/lib/seo/site";

// Home (CLAUDE.md §2 route table): SSR, prerendered per locale; content from /pages/home (public, tag `home`).

export async function generateMetadata({
  params,
}: PageProps<"/[locale]">): Promise<Metadata> {
  const locale = resolveLocale((await params).locale);
  const [home, t] = await Promise.all([
    getHomePage(locale).catch(() => null),
    getTranslations({ locale, namespace: "Metadata" }),
  ]);
  return buildMetadata({
    locale,
    path: "/",
    title: home?.seo?.title ?? t("siteName"),
    description: home?.seo?.description ?? t("description"),
    // The home title already names the site ("Event Horizon — …") — no "| Event Horizon" suffix.
    absoluteTitle: true,
  });
}

export default async function HomePage({ params }: PageProps<"/[locale]">) {
  const locale = resolveLocale((await params).locale);
  const [settings, t] = await Promise.all([
    getSiteSettings(locale).catch(() => null),
    getTranslations({ locale, namespace: "Metadata" }),
  ]);

  const name = settings?.siteName ?? t("siteName");
  const org = settings?.organization;
  // One museum entity for the whole site (same @id in every locale); the WebSite points to it as publisher.
  const museumId = `${siteUrl()}/#museum`;

  return (
    <>
      <HomeTemplate locale={locale} />
      <JsonLd<Museum>
        data={{
          "@context": "https://schema.org",
          "@type": "Museum",
          "@id": museumId,
          name,
          description: t("description"),
          url: `${siteUrl()}/${locale}`,
          // Only the details the API provides (lib/schemas/site-settings.ts) — never placeholders.
          ...(org?.address && {
            address: { "@type": "PostalAddress", ...org.address },
          }),
          ...(org?.telephone && { telephone: org.telephone }),
          ...(org?.openingHours && { openingHours: org.openingHours }),
          ...(org?.sameAs && { sameAs: org.sameAs }),
        }}
      />
      <JsonLd<WebSite>
        data={{
          "@context": "https://schema.org",
          "@type": "WebSite",
          name,
          url: `${siteUrl()}/${locale}`,
          inLanguage: locale,
          publisher: { "@id": museumId },
        }}
      />
    </>
  );
}
