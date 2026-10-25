import "server-only";
import { cache } from "react";
import type { Locale } from "@/lib/i18n/routing";
import { homePageSchema } from "@/lib/schemas/home";
import { getPublic } from "./client";

/** Same for every visitor → public, cached 10 min, refreshed by the `home` webhook tag. Deduped per request. */
export const getHomePage = cache((locale: Locale) =>
  getPublic(`/pages/home?locale=${locale}`, {
    schema: homePageSchema,
    tags: ["home"],
    revalidate: 600,
  }),
);
