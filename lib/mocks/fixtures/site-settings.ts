import type { SiteSettings } from "@/lib/schemas/site-settings";

export const siteSettings: Record<"en" | "ar", SiteSettings> = {
  en: {
    siteName: "Museum",
    tagline: "Mock data served by MSW — replace once the API is available.",
  },
  ar: {
    siteName: "المتحف",
    tagline: "بيانات تجريبية من MSW — تُستبدل عند توفر الواجهة البرمجية.",
  },
};
