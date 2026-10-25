import { LogIn } from "lucide-react";
import { getLocale, getTranslations } from "next-intl/server";
import { Container } from "@/components/ui/Container";
import { getSiteSettings } from "@/lib/api/site-settings";
import type { Locale } from "@/lib/i18n/routing";
import { Link } from "@/lib/i18n/navigation";
import { LanguageSwitch } from "./LanguageSwitch";
import { Logo } from "./Logo";
import { MobileMenu } from "./MobileMenu";
import { NAV, type NavLabels } from "./nav";
import { NavMenus } from "./NavMenus";
import { ThemeToggle } from "./ThemeToggle";

/**
 * Logo · navigation with dropdowns · language, theme, member login. It scrolls away with the page; the
 * announcement bar under it stays (AnnouncementBar). Below the `nav` breakpoint the navigation moves into the
 * menu button's panel.
 */
export async function SiteHeader() {
  const [t, locale] = await Promise.all([
    getTranslations("Header"),
    getLocale(),
  ]);
  const [settings, meta] = await Promise.all([
    getSiteSettings(locale as Locale).catch((error) => {
      console.error("[header] site settings unavailable", error);
      return null;
    }),
    getTranslations("Metadata"),
  ]);
  const siteName = settings?.siteName ?? meta("siteName");
  // Every label the header's client components show, translated here on the server, so the browser needs no
  // translation library (CLAUDE.md §5 — less JavaScript on phones).
  const navLabels: NavLabels = {
    groups: Object.fromEntries(
      NAV.map((group) => [group.key, t(`nav.groups.${group.key}`)]),
    ),
    items: Object.fromEntries(
      NAV.flatMap((group) =>
        "items" in group
          ? group.items.map((item) => [item.key, t(`nav.items.${item.key}`)])
          : [],
      ),
    ),
  };

  return (
    <header className="relative border-b border-border bg-page">
      <Container className="flex h-(--size-header) items-center justify-between gap-4">
        <Link
          href="/"
          aria-label={t("homeLink", { name: siteName })}
          className="rounded-sm focus-ring"
        >
          <Logo name={siteName} tagline={settings?.tagline ?? ""} />
        </Link>

        <NavMenus label={t("navLabel")} labels={navLabels} />

        <div className="flex items-center gap-2">
          <LanguageSwitch
            locale={locale}
            labels={{
              switchLanguage: t("switchLanguage"),
              otherLanguageShort: t("otherLanguageShort"),
            }}
          />
          <ThemeToggle
            labels={{
              theme: t("theme"),
              toLight: t("toLight"),
              toDark: t("toDark"),
            }}
          />
          <Link
            href="/members/login"
            className="ms-2 hidden items-center gap-2 rounded-sm text-nav font-semibold text-text focus-ring transition-colors hover:text-accent-text sm:inline-flex"
          >
            <LogIn aria-hidden="true" className="size-4 rtl:-scale-x-100" />
            {t("login")}
          </Link>
          <MobileMenu
            label={t("menu")}
            navLabel={t("navLabel")}
            labels={navLabels}
          />
        </div>
      </Container>
    </header>
  );
}
