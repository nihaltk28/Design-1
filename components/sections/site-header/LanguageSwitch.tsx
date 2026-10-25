"use client";

import { Link, usePathname } from "@/lib/i18n/navigation";

/**
 * Switches to the other language on the same page. The pill shows the target language's short name in that
 * language (with its own `lang`), and the accessible name says it in full.
 */
export function LanguageSwitch({
  locale,
  labels,
}: {
  locale: string;
  /** Translated on the server — no translation library in the browser. */
  labels: { switchLanguage: string; otherLanguageShort: string };
}) {
  const pathname = usePathname();
  const target = locale === "ar" ? "en" : "ar";

  return (
    <Link
      href={pathname}
      locale={target}
      hrefLang={target}
      aria-label={labels.switchLanguage}
      className="inline-flex size-(--size-icon-button) items-center justify-center rounded-(--radius-pill) border border-border bg-surface-raised font-mono text-micro font-medium text-accent-text focus-ring transition-colors hover:border-accent-text"
    >
      <span lang={target}>{labels.otherLanguageShort}</span>
    </Link>
  );
}
