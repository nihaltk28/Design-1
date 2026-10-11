import { z } from "zod";

// GET /site/settings?locale=<locale> — placeholder contract until the .NET spec exists (PROJECT-SETUP §5.3).
export const siteSettingsSchema = z.object({
  siteName: z.string().min(1),
  tagline: z.string(),
});

export type SiteSettings = z.infer<typeof siteSettingsSchema>;
