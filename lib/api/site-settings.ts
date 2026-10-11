import "server-only";
import { cache } from "react";
import type { Locale } from "@/lib/i18n/routing";
import { siteSettingsSchema } from "@/lib/schemas/site-settings";
import { getPublic } from "./client";

/** Same for every visitor → public, cached 1 h, refreshed by the `settings` webhook tag. Deduped per request. */
export const getSiteSettings = cache((locale: Locale) =>
  getPublic(`/site/settings?locale=${locale}`, {
    schema: siteSettingsSchema,
    tags: ["settings"],
    revalidate: 3600,
  }),
);
