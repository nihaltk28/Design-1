import { getTranslations } from "next-intl/server";
import { HomeHero } from "@/components/sections/home/HomeHero";
import { SmoothScroll } from "@/components/sections/home/SmoothScroll";
import { Container } from "@/components/ui/Container";
import { getHomePage } from "@/lib/api/home";
import type { Locale } from "@/lib/i18n/routing";

/**
 * Template for the `home` content type. One API call for the whole page; each section receives its own slice.
 * Built so far: the scroll journey (the hero and its seven stages), ending in the dive.
 */
export async function HomeTemplate({ locale }: { locale: Locale }) {
  const [home, t] = await Promise.all([
    getHomePage(locale).catch((error) => {
      console.error("[home] content unavailable", error);
      return null;
    }),
    getTranslations({ locale, namespace: "Home" }),
  ]);

  if (!home) {
    return (
      <Container className="py-24">
        <h1 className="text-display font-bold">{t("fallbackTitle")}</h1>
        <p role="status" className="mt-4 text-text-muted">
          {t("unavailable")}
        </p>
      </Container>
    );
  }

  return (
    <>
      {/* Smooth scrolling for the scroll journey (off with reduced motion). */}
      <SmoothScroll />
      <HomeHero
        hero={home.hero}
        galleries={home.galleries}
        journey={home.journey}
        dome={home.dome}
        exhibits={home.exhibits}
        compare={home.compare}
        explore={home.explore}
        stages={home.stages}
        // The hero headline is this page's title — the template owns the outline (CLAUDE.md §4).
        headingLevel={1}
      />
    </>
  );
}
