import type { MetadataRoute } from "next";
import { isProductionSite, siteUrl } from "@/lib/seo/site";

// Staging and development are never indexable (CLAUDE.md §6) — only SITE_ENV=production opens the site.
export default function robots(): MetadataRoute.Robots {
  if (!isProductionSite()) {
    return { rules: { userAgent: "*", disallow: "/" } };
  }
  return {
    rules: { userAgent: "*", allow: "/" },
    sitemap: `${siteUrl()}/sitemap.xml`,
  };
}
