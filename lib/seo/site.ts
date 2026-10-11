// Canonical origin and environment for sitemap, robots and canonical URLs (PROJECT-SETUP §12).

/** Canonical site origin from SITE_URL, without a trailing slash. */
export function siteUrl(): string {
  return (process.env.SITE_URL || "http://localhost:3000").replace(/\/$/, "");
}

/** Only production is indexable — staging and development are noindex (CLAUDE.md §6). */
export function isProductionSite(): boolean {
  return process.env.SITE_ENV === "production";
}
