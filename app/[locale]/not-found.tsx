import { getTranslations } from "next-intl/server";
import { Container } from "@/components/ui/Container";
import { Link } from "@/lib/i18n/navigation";

// Rendered with the locale layout for notFound() and unknown paths ([...rest]) — a real 404 status.
export default async function NotFound() {
  const t = await getTranslations("NotFound");

  return (
    <Container className="py-(--spacing-section-y)">
      <h1 className="text-3xl font-bold">{t("title")}</h1>
      <p className="mt-4 text-lg text-text-muted">{t("body")}</p>
      <p className="mt-6">
        <Link href="/" className="rounded-sm text-brand underline focus-ring">
          {t("home")}
        </Link>
      </p>
    </Container>
  );
}
