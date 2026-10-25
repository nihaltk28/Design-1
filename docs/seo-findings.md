# SEO findings

Open items from the `seo-audit` skill. They stay **Open** until the developer says "do old".

| # | Finding | Where | Found | Status |
|---|---|---|---|---|
| 1 | The home title repeats the site name: "Event Horizon — Museum of Space and Time **\| Event Horizon**". The page title from the API already contains the brand, and the layout's title template appends it again. Fix: the home page sets `title: { absolute: … }` (the home page conventionally shows the brand once), or the API title leaves the brand out. Same in Arabic. | `app/[locale]/(public)/page.tsx` (metadata) · `app/[locale]/layout.tsx:25` (template) | 2026-10-20 | **Fixed 2026-10-20** — `buildMetadata` got an `absoluteTitle` option; the home page uses it. Title now "Event Horizon — Museum of Space and Time" (en) / "أفق الحدث — متحف الفضاء والزمن" (ar) |
| 2 | No `og:image` (and `twitter:card` is `summary`): shared links show no picture. **Missing feature** — add an `opengraph-image` for the home template (per locale, 1200 × 630, absolute URL) and switch the card to `summary_large_image`. | `app/[locale]/(public)/` · `lib/seo/metadata.ts` | 2026-10-20 | **Fixed 2026-10-20** — `app/[locale]/(public)/opengraph-image.tsx` draws a 1200 × 630 share image in code (black-hole ring + Latin wordmark, colours mirrored from tokens and tested in `lib/seo/og-colors.test.ts`); alt text localised; X card `summary_large_image`. Arabic text in the image needs an Arabic .ttf/.otf font — not added |
| 3 | JSON-LD has only `WebSite`. Add a site-wide organisation entity — `Museum` (schema.org) with name, logo, address, opening hours, `sameAs` — through the `lib/seo` JSON-LD component. Needs the museum's real details from the backend / client. | `app/[locale]/(public)/page.tsx` · `lib/seo` | 2026-10-20 | **Fixed (code) 2026-10-20** — `Museum` entity (@id, name, description, url) linked from `WebSite` as publisher. Address, phone, opening hours and `sameAs` are optional fields in the site-settings contract (`lib/schemas/site-settings.ts` → `organization`) and are published only when the API sends them. **Still needs content:** the real details from the backend / client, and a logo image file (the logo is inline SVG today) |

## Checked and expected on local / staging (not findings)

- `noindex, nofollow`, robots.txt `Disallow: /` with no `Sitemap:` line — by design when `SITE_ENV` isn't `production` (`app/robots.ts`).
- Canonical, hreflang and sitemap URLs on `http://localhost:3000` — from `SITE_URL` in `.env.local`. Production must set `SITE_URL` to the real origin; re-run this audit there after launch.

## Passed (2026-10-20)

Title and description present, in each page's language, no duplicates across locales · canonical per locale · hreflang `en`, `ar` + `x-default` · Open Graph title/description/url/type · valid JSON-LD · one `h1` · sitemap lists both locales · unknown URL returns a real 404.
