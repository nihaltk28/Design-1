"use client";

import { useParams } from "next/navigation";
import { useEffect } from "react";
import { Container } from "@/components/ui/Container";
import { routing, type Locale } from "@/lib/i18n/routing";
import ar from "@/messages/ar.json";
import en from "@/messages/en.json";

// The error texts come straight from the message files (picked by the URL's locale) rather than next-intl's
// useTranslations: an error page is loaded with every page, and the translation library it needed was the only
// reason phones downloaded it (CLAUDE.md §5).
const TEXT: Record<Locale, typeof en.Error> = { en: en.Error, ar: ar.Error };

// Route-level error boundary. Never render error.message — it can hold backend details (CLAUDE.md §6).
export default function RouteError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const { locale } = useParams<{ locale: string }>();
  const t =
    TEXT[
      (routing.locales as readonly string[]).includes(locale)
        ? (locale as Locale)
        : routing.defaultLocale
    ];

  useEffect(() => {
    // Monitoring: none — logged to the browser console; server errors go through instrumentation.ts.
    console.error(error);
  }, [error]);

  return (
    <Container className="py-24">
      <h1 className="text-display font-bold">{t.title}</h1>
      <p className="mt-4 text-lg text-text-muted">{t.body}</p>
      <button
        type="button"
        onClick={reset}
        className="mt-6 rounded-md bg-accent px-4 py-2 text-on-accent focus-ring"
      >
        {t.retry}
      </button>
    </Container>
  );
}
