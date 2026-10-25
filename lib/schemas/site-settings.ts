import { z } from "zod";

// GET /site/settings?locale=<locale> — placeholder contract until the .NET spec exists (PROJECT-SETUP §5.3).
export const siteSettingsSchema = z.object({
  siteName: z.string().min(1),
  tagline: z.string(),
  /** The dismissible bar under the header. Optional — no bar when the editors leave it out. */
  announcement: z
    .object({
      text: z.string().min(1),
      cta: z.object({
        label: z.string().min(1),
        href: z.string().startsWith("/"),
      }),
    })
    .optional(),
  /**
   * The museum's public details, for search engines (schema.org Museum in the home page's JSON-LD). All
   * optional — only what the API provides is published; never fill these with placeholder values.
   */
  organization: z
    .object({
      address: z
        .object({
          streetAddress: z.string().min(1),
          addressLocality: z.string().min(1),
          postalCode: z.string().optional(),
          /** ISO 3166-1 alpha-2, e.g. "QA". */
          addressCountry: z.string().length(2),
        })
        .optional(),
      telephone: z.string().min(1).optional(),
      /** schema.org openingHours strings, e.g. "Tu-Su 09:00-18:00". */
      openingHours: z.array(z.string().min(1)).optional(),
      /** Official profiles elsewhere (social media, Wikipedia). */
      sameAs: z.array(z.url()).optional(),
    })
    .optional(),
});

export type SiteSettings = z.infer<typeof siteSettingsSchema>;
