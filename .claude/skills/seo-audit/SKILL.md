---
name: seo-audit
description: SEO check for this project's public pages — what crawlers see in the server-rendered HTML: title and meta description, canonical, hreflang alternates with x-default for every locale, Open Graph and Twitter tags, JSON-LD structured data, one h1, image alt, robots (noindex on staging only), robots.txt and sitemap.xml, duplicate titles and descriptions — then fixes them through generateMetadata and lib/seo. Use when the user asks about SEO, search ranking, Google, meta tags, Open Graph or social previews, structured data, sitemap, robots, canonical or hreflang, or before launch / a site migration.
---

# SEO audit

Rules: `docs/PROJECT-SETUP.md` §9. All metadata comes from **API content**, through `generateMetadata` per route and the builders in `lib/seo` — never hardcoded per page, never added with a raw `<meta>` in a component.

## 1. Run

Production build on a spare port, or **staging** for real content:

```bash
node .claude/skills/seo-audit/seo-check.mjs http://localhost:3300/en/<route> http://localhost:3300/ar/<route> --site
```

Pass several pages at once — it reports duplicate titles and descriptions across them. `--site` also checks `robots.txt` and `sitemap.xml`.

## 2. What each problem means

| Problem | Fix |
|---|---|
| title missing / length outside 15–60 | `generateMetadata` → `title` from the content; the site name comes from the layout's title template |
| description missing / outside 50–160 | From the content's summary field; ask the backend for one if the API has none |
| no / wrong canonical | `alternates.canonical` with the absolute URL (`SITE_URL`) of **this** locale's page, no query string |
| hreflang missing, relative, or no `x-default` | `alternates.languages` for every locale + `x-default` → default locale. Absolute URLs |
| `noindex` | Correct on staging (`SITE_ENV`); a bug on production |
| Open Graph / Twitter missing, relative `og:image` | `openGraph` + `twitter` in the metadata builder; `opengraph-image` per template; absolute image URL |
| no / invalid JSON-LD | `lib/seo` JSON-LD component with `schema-dts` types: `Organization` / `GovernmentOrganization` site-wide, `Article` / `NewsArticle`, `BreadcrumbList`, `WebSite` + `SearchAction` |
| h1 count ≠ 1, img without alt | Fix in the template (see heading-hierarchy / a11y-audit) |
| duplicate titles or descriptions | Each page needs its own; usually a missing `generateMetadata` falling back to the layout |
| robots.txt disallows all / no Sitemap line | `app/robots.ts` — disallow only when not production; always list the sitemap |
| page missing from sitemap | `app/sitemap.ts` must be generated from live API data, every locale |

## 3. Things the script can't judge — check by hand

- Titles and descriptions are **useful** (written for people, not keyword lists), in proper Arabic on Arabic pages.
- Old URLs **301-redirect** to new ones when replacing a site (`redirects.ts`, Playwright redirect tests) — §9 migration.
- Filtered / paginated views are crawlable via real URLs (`nuqs` + `searchParams`), not JS-only state.
- Real 404 / 500 status codes (`/does-not-exist` → 404).
- Core Web Vitals — speed is a ranking factor (`CLAUDE.md` §5; Lighthouse).
- Social previews: paste a URL into the platform's preview tool once deployed.

## Report

```
## SEO — <pages> (<date>, <local | staging | production>)
✅ <passed>
🔧 Fixed: <what, file:line>
🟡 Needs content / backend: <e.g. API has no summary field for descriptions>
⚠️ Staging noindex is expected — re-run on production after launch.
```
