"use client";

import { useTranslations } from "next-intl";
import { useEffect } from "react";
import { Container } from "@/components/ui/Container";

// Route-level error boundary. Never render error.message — it can hold backend details (CLAUDE.md §6).
export default function RouteError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const t = useTranslations("Error");

  useEffect(() => {
    // Monitoring: none — logged to the browser console; server errors go through instrumentation.ts.
    console.error(error);
  }, [error]);

  return (
    <Container className="py-(--spacing-section-y)">
      <h1 className="text-3xl font-bold">{t("title")}</h1>
      <p className="mt-4 text-lg text-text-muted">{t("body")}</p>
      <button
        type="button"
        onClick={reset}
        className="mt-6 rounded-md bg-brand px-4 py-2 text-on-brand focus-ring"
      >
        {t("retry")}
      </button>
    </Container>
  );
}
