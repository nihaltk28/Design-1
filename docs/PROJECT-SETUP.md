# Project Setup Guide — Next.js frontend on any API backend

The team's standard way to build a frontend: **Next.js (App Router) consuming a backend API** — .NET, Laravel, WordPress, Drupal or anything else that serves JSON. This repo is the frontend only; the backend is someone else's and we integrate against its contract.

> **`CLAUDE.md` (repo root) holds the enforced rules and wins wherever the two files differ.** This doc explains the why, and is the onboarding reference. Incident history lives in `docs/known-issues.md`.

### How to use this doc

**New to the project? Read Sections 1 → 3, then run Section 13.** Everything else is reference you'll come back to per page.

| | |
|---|---|
| **What we use and why** | Section 1 |
| **How pages render and cache** | Section 3 |
| **Connecting this project's backend** | Section 4 |
| **Where code goes** | `CLAUDE.md` §1 folder structure |
| **How to build a page** | Section 6 design workflow · Section 5 data · Section 8 a11y · Section 10 performance |
| **Security checks and how to test them** | Section 11 |
| **Before you open a PR** | Section 15 definition of done |
| **Unresolved** | `CLAUDE.md` §10 — answer before the scaffold hardens |

Two rules that are expensive to fix later: **build RTL/i18n from day one** (Section 7) and **never import mock data into a component** (Section 5.3).

---

## 1. Stack decisions

Pin exact versions at scaffold time and commit the lockfile immediately — open ranges let a team drift across majors mid-project. `/scaffold` sets `saveExact: true` in `pnpm-workspace.yaml` (pnpm 11+ ignores it in `.npmrc`), so every `pnpm add` writes an exact version. Before scaffolding, check that recent majors (TypeScript, ESLint, Storybook) are supported by `typescript-eslint`, the Next.js integration and `@storybook/nextjs`; if one lags, pin the previous major. A client deadline is the wrong place to debug a bleeding-edge toolchain.

### Core

| Concern | Choice | Why |
|---|---|---|
| Framework | **Next.js 16, App Router** | Server rendering gives SEO and fast first paint; a plain SPA (CRA/Vite) regresses SEO on public sites and pushes data fetching to the browser |
| UI | **React 19** | Server Components by default keep data fetching and most code out of the client bundle |
| Language | **TypeScript (strict)** | Types the seam between us and the backend contract (Section 5) |
| i18n | **next-intl** | Locale routing (`/en`, `/ar`), message catalogs, locale-aware dates/numbers. Skipped only for single-language projects |
| Package manager | **pnpm** | Fast, strict dependency resolution |

### Styling & layout

| Concern | Choice | Why |
|---|---|---|
| Styling | **Tailwind CSS v4** | CSS-first: `styles/tokens.css` *is* the config via `@theme`, so design tokens have one source of truth |
| Variants | **class-variance-authority** | Typed variants on primitives (`<Button size="lg" tone="ghost">`) |
| Class handling | **clsx + tailwind-merge** (`cn()`) | Conditional classes and parent overrides without conflicts |
| RTL | **Logical properties + `dir` on `<html>`** | One class set serves both directions |
| Laptop scaling | **Fluid root font size (`styles/scaling.css`) — 16 px @1920 → 13 px @1280** | Windows / macOS 125–175% scaling narrows the viewport to 1536–1097 px; one root rule scales every rem-based size instead of a media query per screen (`CLAUDE.md` §7) |
| Responsive | **Mobile-first + fluid `clamp()` tokens + named, measured breakpoints** | Designs usually arrive as one fixed-width frame; stock breakpoint jumps overflow between the widths you tested (`CLAUDE.md` §7) |
| Fonts | **next/font/local** | Self-hosted, subsetted; unsubsetted Arabic families are a common LCP failure |

### Data & state

| Concern | Choice | Why |
|---|---|---|
| Server data | **`fetch` through `lib/api` (`getPublic` / `getPrivate`)** | Next's data cache + tags for shared data; per-user data never cached (Section 3) |
| Contract types | **Generated from the backend's spec where one exists** | Contract drift becomes a compile error (Section 4 table) |
| Runtime validation | **Zod** | Types vanish at build time; Zod fails loudly at the boundary if the API changes shape |
| API mocking | **MSW v2** | Build against the agreed contract before endpoints exist |
| URL state | **nuqs** | Filters/search/pagination in `searchParams` — linkable, shareable, crawlable |
| Client server-state | **TanStack Query — only where needed** | Logged-in, interactive surfaces (dashboards, live lists). Public content doesn't need it |
| Forms | **React Hook Form + Zod resolver** | One schema shared between client and server validation |

### Content & testing

| Concern | Choice | Why |
|---|---|---|
| CMS rich text | **unified / rehype pipeline** | CMS HTML must be sanitised *and* restyled, never injected (Section 5.4) |
| Structured data | **schema-dts** | Type-checked JSON-LD |
| Unit/logic | **Vitest** | Mappers, formatters, validators, URL helpers — not presentational components |
| Component | **React Testing Library** | Client components with real interaction logic only |
| E2E + a11y | **Playwright + `@axe-core/playwright`** | Full routes, every locale, redirects, a11y on every PR |
| Workbench | **Storybook + `@storybook/addon-a11y`** | `components/ui` primitives only, with an RTL toggle |
| Lint/format | **ESLint (flat) + `eslint-plugin-jsx-a11y` + Prettier + `prettier-plugin-tailwindcss`** | `jsx-a11y` has no Biome equivalent |
| Project rules | **`eslint.project-rules.mjs` + Claude Code hook** | `CLAUDE.md` rules enforced mechanically, for people and for Claude |
| Git hooks | **Husky + lint-staged + secretlint** | Block bad commits, leaked secrets and AI attribution lines before CI |
| Perf gate | **Lighthouse CI** | Asserts Section 10 budgets per template |
| Markup validity | **html-validate** | Invalid HTML passes axe silently |
| Monitoring | **Per project** (`CLAUDE.md` §1) | Sentry or equivalent if budgeted; otherwise `console.error` in `error.tsx` / `global-error.tsx` and `instrumentation.ts` |

**Testing split:** Vitest for logic, RTL for interactive client components, Storybook for primitives in both directions, Playwright for pages. Async Server Components aren't unit-testable — pages are Playwright's job.

---

## 2. Architecture

```
Browser ──► Next.js server (this repo) ──► Backend API (CLAUDE.md "Project")
             │  renders HTML (SSR)            owns data, auth, business rules
             │  caches shared API data
             └─ proxy.ts: locale, auth redirects, security headers
```

- **The Next.js server is the only thing that talks to the backend for rendering.** The browser only calls the backend directly for logged-in, client-interactive features — and even then prefer going through a Next route handler so secrets and internal hostnames stay server-side.
- **The backend contract is a given.** Agree the response *shape* before building, raise payload problems (Section 5.5) with the backend team, and never work around a bad contract inside components.
- This template is for **headless** builds (separate frontend app + API). A site rendered by the CMS's own theme (WordPress theme, Drupal Twig) is a different setup and doesn't use this repo.

---

## 3. Rendering & caching

The backend only serves an API — so rendering mode decides **who calls that API, and how often.**

| Mode | Who calls the API | When | Result |
|---|---|---|---|
| **CSR** (client-side) | Each visitor's browser | After the page loads | Empty page first, weak SEO, every visitor hits the API |
| **SSR** | Our Next.js server | On every request | Always fresh, good SEO — but every visitor costs an API call and waits for it |
| **SSR + cached data** | Our Next.js server | Once per cache window, or until the backend says content changed | Fresh enough, fast, SEO-friendly, protects the backend |

**Team default: SSR, with every response that's the same for all users cached.** 1,000 visitors to a news page = 1 API call instead of 1,000; the page is still server-rendered per request, so anything per-user stays correct.

### Per page type

| Page type | Mode | Data |
|---|---|---|
| Public content (home, articles, about, services) | SSR | `getPublic` with tags + a time limit |
| Search / filtered lists | SSR | Results uncached (depend on the query); filter lookups via `getPublic` |
| Logged-in dashboards, account pages | SSR shell + client fetching where interactive | `getPrivate` only; TanStack Query for interactions |
| Fixed pages with no API data (privacy, terms) | Static | none |
| Forms (contact, subscribe) | — | Server Action or route handler — one choice per project |

Each project records its decision per route in the **`CLAUDE.md` §2 route table**.

### How it's wired

```ts
// lib/api/client.ts — the only place fetch is called
getPublic(path, { schema, tags, revalidate })   // shared by all users: next: { tags, revalidate }
getPrivate(path, { schema })                    // per-user: cache: "no-store", forwards auth
```

- **Tags** name what the data is (`news`, `news:123`). When the backend can call a webhook on publish, `app/api/revalidate` (protected by a shared secret) calls `revalidateTag()` for exactly those tags — content goes live without a redeploy. Time-based `revalidate` stays as the fallback.
- **Never cache per-user data.** A cached response containing one user's data will be served to the next user.
- **SSR costs server time**, so: TTFB target < 800ms; stream slow sections with `<Suspense>`; run independent fetches with `Promise.all`; dedupe with React `cache()`; give every API call a timeout and a fallback; load-test before launch and size server instances for peak traffic.
- **HTTP caching:** HTML for logged-in pages `private, no-store`. Hashed static assets are cached for a year by Next — don't override. Anonymous HTML may get a short CDN cache only if the hosting setup is designed for it.
- **Never apply `force-dynamic` or `cache: "no-store"` globally** to "see fresh content" — it silently removes the whole caching layer.

---

## 4. Connecting the backend

Everything in the frontend is identical across backends except these points. Fill `{{TYPES_SOURCE}}` and `{{REFRESH_STRATEGY}}` in `CLAUDE.md` from this table; auth goes into the `CLAUDE.md` §10 open decision until it's settled.

| Backend | Types come from | Rich-text HTML | Refresh on publish | Watch out for |
|---|---|---|---|---|
| **.NET (ASP.NET Core)** | OpenAPI/Swagger (emitted by default) → `openapi-typescript` → `lib/api/generated.ts` | Depends on the API | Webhook from the save/publish flow | Casing of JSON fields; dates as UTC strings |
| **Laravel** | OpenAPI via Scramble or L5-Swagger → `openapi-typescript`. No spec → Zod schemas, types via `z.infer` | Usually clean | Model event / observer → webhook | Sanctum cookie auth needs CSRF handling; pagination envelope shape |
| **WordPress (headless)** | REST → Zod schemas. WPGraphQL → `graphql-codegen` | Gutenberg HTML → rehype (strip WP block classes) | `save_post` hook → webhook | ACF field shapes, image sizes, preview/drafts, `_embed` for related data |
| **Drupal (headless)** | JSON:API → Zod + a deserialiser. GraphQL → `graphql-codegen`. Consider the `next-drupal` module | Body/text fields → rehype | Drupal cache tags map directly to Next tags | JSON:API verbosity — use `include=` and sparse fieldsets to avoid N+1 |
| **Other / custom** | OpenAPI if available; otherwise Zod schemas as the contract | Treat any HTML as untrusted | Webhook if possible, else time-based | Agree the shape in writing before building |

**Auth (if the project has login):** session held in an httpOnly cookie set by the server, never in `localStorage`. `proxy.ts` redirects unauthenticated users; `getPrivate` forwards the session. Token refresh and logout are designed once, early — not per page.

---

## 5. API integration layer

### 5.1 Types and validation

- Generate types from the backend spec where one exists (Section 4), via a committed `pnpm gen:types` script. Hand-maintained DTO mirrors drift within weeks.
- Validate every response with Zod at the boundary. If a field arrives null where the contract says string, the failure surfaces there with a useful message — not three components deep.
- Map DTOs to view models in `lib/utils` (pure functions, Vitest-tested). Components receive view models, not raw API shapes.

### 5.2 The client

- `lib/api/client.ts` owns base URL (server-only env var), timeouts, error handling, auth forwarding, cache tags, and URL encoding of media paths (centralise it — mixed encode/decode is a classic source of 404s).
- **Components never call `fetch`** (lint-enforced). Everything goes through `getPublic` / `getPrivate`.

### 5.3 Building before the API exists

1. **Agree the response shape first**, even on paper. Twenty pages built on an invented shape get rebuilt when the real contract lands.
2. **Mock at the network layer with MSW; never import fixtures into components** (lint-enforced). Components always call the real client; only the transport is faked, via `NEXT_PUBLIC_USE_MOCKS`.

When the real API arrives, flip the flag — Zod immediately reports every place reality differs from the mock, which is exactly the report you want.

### 5.4 CMS rich text

Any HTML from a CMS field is untrusted and unstyled for our design system. Never `dangerouslySetInnerHTML` it (lint-enforced). Run it through `lib/content` on the server:

```
rehype-parse → rehype-sanitize (allowlist) → custom rewrites → rehype-react
```

1. Sanitise against an allowlist — the primary XSS defence.
2. Strip CMS presentation: inline styles, legacy tags, editor/block classes, layout tables — so content inherits the design tokens.
3. Rewrite internal links to `next/link` and old paths to new routes (reuse the redirect map).
4. Convert `<img>` to `next/image` with dimensions.
5. Add heading `id`s; flag images with missing or junk `alt` at build time.

### 5.5 Payloads — agree with the backend team

- Only the fields the UI needs.
- Shared objects in one index keyed by ID, referenced by ID — not duplicated per item.
- Related records in one call; no N+1 loops on either side.
- Lists paginated server-side.

---

## 6. Design workflow

Three possible inputs (Figma, existing HTML, screenshots) feed one codebase. Build page-by-page from whatever's in front of you and spacing, type and colour drift apart. Sequence it:

1. **Tokens first.** Colours, type scale, spacing, radii, shadows from Figma into `styles/tokens.css` (`@theme`). Contrast-check the palette the day it lands.
2. **Primitives next.** `components/ui` against the Figma component library, consuming only tokens.
3. **Figma pages.** Templates in `components/templates`, composed from `sections` and `ui`. Use the Figma MCP connector in Claude Code, one frame at a time (file key + node ID).
4. **HTML-sourced pages.** A mini migration, not copy-paste: extract content and structure, reuse existing primitives/sections, rebuild the rest against tokens, and flag hidden business logic (validation rules, conditional content) to the backend owner.
5. **Reconciliation.** Once pages exist from both sources, compare side by side (Storybook) and merge near-duplicate values into tokens.

**Screenshots only (no Figma):** keep them in `docs/design/`, one per page and breakpoint. Tokens estimated from a screenshot are marked as estimates and confirmed with the client — a brand guide always wins. RTL, missing breakpoints and interaction states come from the shared primitives; images and icons come as original files, never cropped from a screenshot. Rules: `CLAUDE.md` §7.

**Figma MCP notes:** output quality tracks file quality (auto-layout + variables convert cleanly; absolutely-positioned frames don't). Asset URLs expire in ~7 days — download immediately. Figma gives layout, not semantics: headings, landmarks, alt text, RTL and keyboard behaviour are always manual work (Section 8).

---

## 7. i18n / RTL

- Routes under `app/[locale]/...`; `dir` and `lang` set on `<html>` from the locale.
- Logical Tailwind properties everywhere, so one class set serves both directions. ESLint rejects `pl-`/`mr-`/`left-`/`text-right` and friends.
- No hardcoded JSX text (`react/jsx-no-literals`). Translation keys are typed against the default locale (`global.d.ts`), so a wrong key fails `pnpm typecheck`; `lib/i18n/messages.test.ts` fails if any locale is missing a key or has an empty value.
- Arabic typography needs its own line-height/letter-spacing tokens — don't reuse Latin values.
- `hreflang` alternates + `x-default` per page via the metadata API.
- Decide once, in `lib/utils`: numerals (Western vs Eastern Arabic) and calendar (Gregorian vs Hijri) per locale, plus RTL-aware date pickers.
- A native reviewer per language is a project requirement, not a nice-to-have.

---

## 8. Accessibility

**Target: WCAG 2.2 AA** — confirm the exact version and level in the contract; the acceptance test runs against whatever is written there.

**Qatar government projects:** Mada Center certification is a separate, contractual deliverable on top of WCAG. Confirm the certification track and whether it's a launch gate, and budget a Mada (or accredited) audit before launch. An automated-clean report is not Mada sign-off. Reference certification status on the Accessibility Statement page.

### Enforced in the build

| Layer | Tool | Catches |
|---|---|---|
| Lint | `eslint-plugin-jsx-a11y` (strict) + project rules | Missing alt, invalid ARIA, click handlers on non-interactive elements, `outline-none` |
| Component | `vitest-axe` | Violations per component |
| Storybook | `@storybook/addon-a11y` | Live axe panel while building |
| E2E | `@axe-core/playwright` (`tests/e2e/layout.spec.ts`) | Full-page violations and horizontal overflow, every locale at 320 / 768 / 1280 / 1536 / 1920 |
| Markup | `html-validate` (`tests/e2e/markup.spec.ts`, rules in `.htmlvalidate.json`) | Invalid nesting, duplicate IDs, unclosed tags — every template, every locale |

Automation catches about a third of issues. The per-component rules in `CLAUDE.md` §4 cover the rest — keyboard, focus, route-change announcements, forms, contrast.

- Test with a screen reader **in Arabic** too — RTL reading-order bugs don't surface in the LTR pass.
- Verify reflow at 320px and 200% text resize in every direction.
- Vet third-party embeds (maps, video, social, PDF viewers) before committing to them. PDF remediation is a separate workstream — get it assigned.
- Ship an **Accessibility Statement** page with a real contact route.

---

## 9. SEO & URL migration

Check any page with the **`seo-audit`** skill (`.claude/skills/seo-audit/`) — it reports everything below that a crawler can see, and the site-level robots / sitemap.

Framework choice already covers the basics. For public sites:

- `generateMetadata` per route with titles/descriptions **from API content**; canonical URL; `hreflang` + `x-default`; Open Graph + an `opengraph-image` per template.
- JSON-LD via `schema-dts` (`Organization`/`GovernmentOrganization`, `Article`/`NewsArticle`, `BreadcrumbList`, `WebSite` + `SearchAction`).
- `app/sitemap.ts` generated from live API data, every locale; `app/robots.ts`. **Staging `noindex`, production not** — verify both.
- Primary content server-rendered; filters via `nuqs` + `searchParams`, so filtered views are crawlable.
- One trailing-slash and casing convention. `not-found.tsx` returns a real 404, error pages a real 500.
- Decide Arabic slugs vs transliteration early — changing later means a second redirect map.

**Replacing an existing site** — the biggest SEO risk is changed URLs:

- Crawl the old site (Screaming Frog) for a full URL inventory before anything else; pull top landing pages and backlinks from Search Console.
- Keep URLs identical where possible; otherwise a `301` map in `redirects.ts`. Assert redirects in Playwright.
- Set up Search Console / Bing Webmaster **before** cutover; submit sitemaps at launch; watch crawl errors daily for two weeks.

---

## 10. Performance budget

Targets at p75 on mid-range mobile: **LCP < 2.5s · INP < 200ms · CLS < 0.1 · TTFB < 800ms.** Per-task rules are in `CLAUDE.md` §5; this section is budgets and tooling.

- **Lighthouse CI** (`@lhci/cli`) with asserted budgets on the main templates (home, list, detail, form page).
- **JS budget per route**, measured with `@next/bundle-analyzer` (`ANALYZE=true pnpm build`) before deciding what to `next/dynamic`.
- **Fonts** are the usual culprit on Arabic sites: subset, self-host, `swap`, preload only above-the-fold weights.
- **Third-party scripts** via `next/script` — they're the most common reason a good score degrades after launch.
- **Measure field data** (Search Console CWV report / RUM) after launch, not only Lighthouse lab runs.
- Every speed change: Lighthouse before and after, numbers in the PR. Test throttled / on a mid-range device.

---

## 11. Security & compliance

The rules are in `CLAUDE.md` §6. This section is the why, and **how to test each one** — run the per-area checks whenever a PR touches that area, and the full list on staging before launch.

**Already handled by the template:** lint blocks `dangerouslySetInnerHTML`, CDN libraries and raw `<script src>`; components can't call `fetch`, so the browser never talks to the backend directly; `getPrivate` is never cached, so one user's data can't be served to another.

**Why the frontend matters even though the backend owns auth:** Server Actions and route handlers are public HTTP endpoints on *our* server. Anyone can call them with `curl`, skipping the page, the button and the browser validation. Every check that matters has to happen on the server.

### Forms & anything that writes

| Check | How to test |
|---|---|
| Server validates input with the same Zod schema as the client | DevTools → Network → right-click the request → *Copy as cURL*; change a field to junk, an empty string or a 10,000-character value and resend. The server must reject it with a clean error |
| Server Action / route handler checks the session and permission itself | Resend that request from a logged-out private window, and logged in as a different user. It must refuse |
| Cookie-authenticated route handlers check `Origin` | Resend with `-H "Origin: https://evil.example"`. It must refuse |
| Abuse protection on public forms | Submit the form 20+ times in a minute. It should slow down or block |
| Errors are generic | Force a failure (backend down, bad input). The user sees a friendly message — no stack trace, SQL, file path or raw backend text |
| Login / reset don't reveal accounts | Try a real email and a made-up one. Same message, same timing |
| File uploads restricted on the server | Upload an `.html` or `.svg` renamed to `.jpg`, an `.exe`, and a file over the limit. All rejected server-side |

If reCAPTCHA is ruled out for accessibility, pick an accessible bot mitigation (rate limit + honeypot, or an accessible challenge).

### Webhooks

The template ships a hardened `app/api/revalidate/route.ts`. The backend calls it like this:

```
POST /api/revalidate
X-Revalidate-Secret: <REVALIDATE_SECRET>
Content-Type: application/json

{ "tags": ["news", "news:123"] }
```

| Protection | Why | Tested by |
|---|---|---|
| POST only | Other methods get 405 from Next | `revalidate.test.ts` |
| Secret in a header, not the URL | Query strings end up in server, proxy and CDN logs | — (by design) |
| Constant-time comparison (`secretMatches`) | `===` leaks how much of a guess was right through response timing | `security.test.ts` |
| Refuse when `REVALIDATE_SECRET` is unset | An empty env var must not mean "anyone may call" | both |
| JSON only, 4 KB max, strict tag pattern, max 50 tags | Stops oversized or crafted payloads | `revalidate.test.ts` |
| Rate limit (30 / min / IP) | Slows secret guessing and flooding | `revalidate.test.ts` |
| `revalidateTag(tag, { expire: 0 })` | Next 16: route handlers can't use `updateTag`; this makes the next request fetch fresh data | `revalidate.test.ts` |
| Never log the secret or headers | Logs are read by more people than secrets | review |

Manual check on staging: `curl -X POST` with a wrong secret → 401; `curl` with GET → 405; 31 quick calls → 429.

### Rate limiting

`lib/security/rate-limit.ts` is a fixed-window limiter kept **in memory**. Pick per project, once hosting is known:

| Hosting | Use |
|---|---|
| One Node server / one container | `rateLimit()` as shipped |
| Several containers, autoscaling, or serverless | The CDN / WAF's rate limiting (Front Door, Cloudflare, Pantheon's edge), **or** replace the `Map` in `rateLimit()` with a shared store (Redis, Upstash, a KV) — same function signature, so callers don't change |
| Behind a CDN that already rate-limits the route | Keep `rateLimit()` as a second layer |

`clientIp()` reads `X-Forwarded-For`. That's only trustworthy when the platform or CDN overwrites the header; otherwise a client can send any value. Check this per host.

Test: submit the form or call the endpoint more than the limit within a minute → 429 with `Retry-After`. On multi-instance hosting, repeat the test against the public URL, not one container.

### Captcha

Start without one: rate limit + honeypot stops most abuse. If a form still gets spam:

- Use a captcha with **no visual challenge**: reCAPTCHA **v3**, Cloudflare Turnstile, or similar. reCAPTCHA v2 (including "invisible") can fall back to an image puzzle — that fails WCAG and Mada.
- **Verify the token on the server**, inside the Server Action, with the provider's secret key (server-only env var). A token checked only in the browser protects nothing.
- Low score → fall back to honeypot + rate limit, never to a puzzle.
- If the backend (e.g. Drupal) also verifies, agree the token field name and format with the backend developer **before** building the form.

Test: submit with no token, a fake token and an expired token → all refused by the server.

### Sanitising CMS HTML — server, not browser

Rich text is cleaned **on the server** with rehype-sanitize (Section 5.4), before it reaches the page. Browser-side sanitisers such as DOMPurify add JavaScript to every page and only run after the unsafe HTML has already been delivered. Use one only if a project genuinely can't sanitise on the server — and then still sanitise on the server too.

### Login & sessions

| Check | How to test |
|---|---|
| Session cookie is httpOnly, Secure, SameSite | DevTools → Application → Cookies: all three flags set. Local/Session Storage hold no tokens |
| Logged-out users can't reach private pages | Open a private URL in a private window → redirected to login |
| Users can't see each other's data | Logged in as user A, open a URL with user B's record ID. Must be refused — report to the backend owner if it isn't |
| Redirects stay on our site | Try `/login?next=https://evil.example` and `?next=//evil.example`. Must land on our own page |
| Logout really ends the session | Log out, press Back, refresh; replay an old request with its cookie. No private data |
| Private pages aren't cached | Response header is `Cache-Control: private, no-store` |

Auth design (cookie session, refresh, logout) is decided once, early — Section 4.

### Every page

| Check | How to test |
|---|---|
| Security headers present | Scan staging with [securityheaders.com](https://securityheaders.com) or Mozilla Observatory; aim for an A. CSP starts report-only, enforced before launch |
| CMS rich-text can't run scripts | Put `<script>alert(1)</script>`, `<img src=x onerror=alert(1)>` and a `javascript:` link in a CMS field. Nothing runs, the link is stripped |
| URL params and search are safe | Search for `<script>alert(1)</script>` and put it in URL params. Shown as text only |
| No secrets in the browser | DevTools → Sources → search all JS for `key`, `secret`, `token`, `password` and internal hostnames. Nothing found |
| Staging is private | Open staging from outside the office network / logged out. Blocked, and `noindex` set |

### Code & dependencies

- `pnpm audit --prod` before adding a dependency and in CI; Dependabot or Renovate for updates.
- `import "server-only"` in server modules makes the build fail if one is ever imported into client code.
- Secret scanning: GitHub secret scanning, or `gitleaks` locally. A leaked secret is rotated, not just deleted from git.

### Compliance & before launch

- Cookie consent if analytics run: keyboard- and screen-reader-accessible, non-essential cookies off by default, never blocking content from crawlers.
- Privacy Policy, Terms and Accessibility Statement as real routes — usually contractual.
- Run an **OWASP ZAP** baseline scan against staging yourself first — it's free and catches the obvious issues before the real test.
- Assume a **penetration test** before launch; agree who runs it and leave time to fix findings.
- **Qatar government projects:** check the contract for National Information Assurance (NIA) requirements — like Mada, they can be a launch condition.

---

## 12. Environment & config

```
.env.local  (copy from the template's .env.example)
  API_BASE_URL=                    # server-only — read at runtime; empty + mocks on = MSW fixtures
  REVALIDATE_SECRET=               # shared with the backend webhook
  NEXT_PUBLIC_USE_MOCKS=true       # MSW on/off — never true in production
  NEXT_PUBLIC_DEFAULT_LOCALE=
  SITE_URL=                        # canonical origin — sitemap, robots, canonical URLs
  SITE_ENV=development             # development | staging | production — anything but production is noindex
```

- Commit `.env.example` with every key and no secret values; never commit `.env.local`.
- **Mocks:** with `NEXT_PUBLIC_USE_MOCKS=true`, `lib/api/client.ts` starts MSW itself (also inside `next build` workers, where `instrumentation.ts` doesn't run) and falls back to a fixed mock base URL when `API_BASE_URL` is empty. CI builds and tests this way.
- **Real builds need the API:** locale pages are prerendered at build time (`generateStaticParams`), so a non-mock build must be able to reach `API_BASE_URL` from the build machine. Separate env per environment (dev / staging / prod).
- **`NEXT_PUBLIC_*` is inlined at build time**, so one build can't be promoted across environments if those values differ. Keep environment-varying config (API URL) server-only so one artifact works everywhere.
- **Docker:** not needed for local dev. For container hosting, set `output: "standalone"` in `next.config.ts` and add a `HEALTHCHECK` that requests a real route. Who owns the Dockerfile and pipeline is an infra decision (`CLAUDE.md` §10).

---

## 13. Scaffolding a new project

**Recommended:** open this folder in Claude Code and run **`/scaffold`**. It asks the project questions, fills `CLAUDE.md`, creates the app, folders and starter files, wires the lint rules and checks that lint and build pass.

**Manual equivalent:**

```bash
# create-next-app refuses a non-empty folder and must not create a second git repo — use a temp folder,
# then copy ONLY package.json, pnpm-lock.yaml, pnpm-workspace.yaml, tsconfig.json, postcss.config.mjs,
# eslint.config.mjs, app/globals.css, app/favicon.ico (see /scaffold Step 4 for the full list of files to keep)
pnpm create next-app@latest ../tmp-app --typescript --tailwind --eslint --app --use-pnpm \
  --no-src-dir --import-alias "@/*" --disable-git --yes

pnpm add next-intl zod class-variance-authority clsx tailwind-merge \
  react-hook-form @hookform/resolvers nuqs schema-dts server-only

# only if the API returns rich-text HTML (Section 5.4)
pnpm add unified rehype-parse rehype-sanitize rehype-react

# only for logged-in, client-interactive surfaces (Section 3)
# pnpm add @tanstack/react-query

pnpm add -D msw openapi-typescript \
  vitest @vitejs/plugin-react jsdom @testing-library/react @testing-library/jest-dom \
  @playwright/test @axe-core/playwright vitest-axe \
  storybook @storybook/nextjs @storybook/addon-a11y \
  prettier prettier-plugin-tailwindcss eslint-plugin-jsx-a11y husky lint-staged \
  html-validate @next/bundle-analyzer @lhci/cli culori @types/culori \
  secretlint @secretlint/secretlint-rule-preset-recommend \
  sharp   # direct dependency: .claude/skills/images-webp imports it (pnpm doesn't expose Next's copy)
# GraphQL backend: add @graphql-codegen/cli (+ presets) instead of openapi-typescript

pnpm add -D @types/node@24    # match your Node major; create-next-app's default is older than Vitest accepts — then remove the ^ it writes
# pnpm 10+: if install stops with ERR_PNPM_IGNORED_BUILDS, set each package under allowBuilds in
# pnpm-workspace.yaml to false and re-run (none are needed for this stack)

# no `npx husky init` — it overwrites the template's hooks; the "prepare" script installs them
# no `storybook init` — it installs a different framework and overwrites vitest.config.mts; .storybook/ is already set up
pnpm exec playwright install chromium   # no --with-deps: that needs sudo
```

Then:

1. Check installed versions against Section 1's compatibility note before committing the lockfile. Add `"engines": { "node": ">=XX" }` from `node -v`.
2. Wire `eslint.project-rules.mjs` **last** in `eslint.config.mjs`; `chmod +x .claude/hooks/lint-changed.sh`; run `pnpm lint`.
3. next-intl config + `app/[locale]` layout (lang, dir, skip link, route-change focus/announcer).
4. `styles/tokens.css` with placeholder tokens; contrast-check the real palette the day it arrives.
5. `lib/api/client.ts` with `getPublic` / `getPrivate`, timeouts and Zod parsing; `pnpm gen:types` (skip until the spec URL exists).
6. MSW with a couple of stub endpoints to prove the wiring end-to-end.
7. `sitemap.ts`, `robots.ts`, `not-found.tsx`, `error.tsx`, `global-error.tsx`, `proxy.ts` (locale + security headers) — **no `app/[locale]/loading.tsx`** (`known-issues.md` #1).
8. One throwaway page through the full pipeline (token → component → template → route, every locale, RTL, axe clean, budget met) before scaling out.

---

## 14. Milestone checklist before real page work

- [ ] Hosting target and browser matrix confirmed (`CLAUDE.md` §10)
- [ ] Backend contract shape agreed; types source decided (Section 4)
- [ ] Tokens in `tokens.css`, contrast-validated at AA
- [ ] Core `components/ui` primitives built, Storybook a11y panel clean
- [ ] i18n routing with correct `dir` switching; skip link + route-change focus in the layout
- [ ] `getPublic` / `getPrivate` + Zod + MSW working, one page rendering mocked data
- [ ] Rich-text pipeline proven on one real CMS field (if applicable)
- [ ] One Figma page and one HTML-sourced page built end-to-end and reconciled (if both sources exist)
- [ ] Playwright smoke test on every locale
- [ ] `sitemap.ts`, `robots.ts`, canonical + hreflang + `x-default`, real 404/500
- [ ] Security headers set (CSP report-only), staging `noindex` and behind a login / IP allowlist
- [ ] `server-only` in `lib/api/client.ts`; one form's Server Action tested by calling it directly while logged out (Section 11)
- [ ] Old-site URL inventory crawled and redirect map started (if replacing a site)
- [ ] CI: lint, typecheck, Vitest, Playwright, axe, html-validate, `pnpm audit`, Lighthouse budgets
- [ ] Mada track confirmed and audit budgeted (Qatar government projects)

---

## 15. Definition of done (per page)

The PR template (`.azuredevops/pull_request_template.md`) carries these, plus the `CLAUDE.md` §8 items:

- [ ] Renders correctly in every locale, at 320px, tablet and desktop
- [ ] Zero axe violations; keyboard-navigable; heading order valid
- [ ] Zero `html-validate` errors
- [ ] Metadata, canonical, hreflang and JSON-LD correct
- [ ] Empty, loading and error states implemented
- [ ] Route row in `CLAUDE.md` §2 exists and the data calls match it
- [ ] Meets the Section 10 budget
- [ ] Forms / writes: server-side validation and session check tested directly; no secrets in the client bundle (Section 11)
- [ ] Old URL redirects to it (where one exists)
- [ ] Content reviewed by each language's reviewer

---

## 16. Page inventory

**Fill this before page work starts** — it's the ticket list. One row per route; its rendering decision goes in `CLAUDE.md` §2.

| Route | Content type | Source | Figma node / old URL | Priority | Owner | Status |
|---|---|---|---|---|---|---|
| `/` | home | | | P0 | | |
| | | | | | | |

Fill it from the Figma file for designed screens and from the old-site crawl (Section 9) for anything being ported. Build order: tokens and primitives, one page end-to-end (Section 14), then P0 routes, then the rest.

---

## 17. Scripts & workflow

```jsonc
{
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start",
    "gen:types": "openapi-typescript <SPEC_URL> -o lib/api/generated.ts",
    "lint": "eslint .",
    "format": "prettier --write .",
    "typecheck": "next typegen && tsc --noEmit",
    "test": "vitest",
    "test:e2e": "playwright test",
    "test:visual": "VISUAL=1 playwright test layout",
    "token:clamp": "node scripts/clamp.mjs",
    "prepare": "husky",
    "audit": "pnpm audit --prod",
    "secrets": "git ls-files -z | xargs -0 secretlint",
    "types:check": "pnpm gen:types && git diff --exit-code -- lib/api/generated.ts",
    "storybook": "storybook dev -p 6006",
    "lhci": "lhci autorun"
  }
}
```

**First run:**

```bash
pnpm install
cp .env.example .env.local
pnpm gen:types        # skip until the spec URL exists
pnpm dev              # NEXT_PUBLIC_USE_MOCKS=true runs entirely on MSW
```

**Branch & PR flow:** branch per page/feature off `development`; never commit to it directly. Section 15 is the PR template.

- **Pre-commit** (Husky + `lint-staged.config.mjs`): secretlint on every staged file; ESLint `--fix` and Prettier on staged files; messages parity when `messages/*.json` changes; contrast when `tokens.css` changes.
- **Commit message** (`.husky/commit-msg`): rejects AI attribution lines (`Co-Authored-By: Claude`, "Generated with Claude Code"). Claude also asks the developer before every commit and every push (`CLAUDE.md` §3).
- **PR validation** (`azure-pipelines.pr.yml`, made required via a branch policy): lint, typecheck, Vitest, `pnpm audit --prod` (high+), Playwright overflow + axe on every locale. HTML validation runs inside `test:e2e` (`markup.spec.ts`). Still to add: Lighthouse budgets — start as warnings only, since shared agents give noisy scores — and `pnpm types:check` once the spec URL exists.

Nothing gets reviewed until the PR pipeline is green. Regenerated API types are committed with the change that needed them.
