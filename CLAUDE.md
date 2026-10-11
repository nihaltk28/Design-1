# Museum — frontend

Rules Claude must follow in this repo. Rationale and onboarding: `docs/PROJECT-SETUP.md`. Incident history: `docs/known-issues.md`. Where they differ, this file wins.

## Project

- **What:** Bilingual public website and visitor portal
- **Architecture:** this repo is the **frontend only** — Next.js → .NET (ASP.NET Core) API (REST/JSON). We consume the API; we don't own it. Backend owner: TBD.
- **Audience:** both — public site plus a logged-in visitor portal. Login is not built yet; it waits on the auth decision (§10)
- **Languages:** `en`, `ar` (default `en`)
- **Design source:** a mix — Figma, existing HTML and screenshots (§7 covers each)
- **Acceptance bar:** WCAG 2.2 AA + Mada certification, the §5 performance targets, SEO parity with the old site.

## 1. Stack & structure — locked, don't relitigate

- Next.js 16 (App Router) · React 19 · TypeScript (strict) · pnpm
- **Tailwind CSS v4 only — no Bootstrap.** Design tokens in `styles/tokens.css` via `@theme`
- i18n: `next-intl`, routes under `app/[locale]/...`.
- API: typed client in `lib/api`. Types from **the .NET OpenAPI/Swagger spec → `openapi-typescript` → `lib/api/generated.ts`** (`pnpm gen:types`; spec URL not available yet) (see `PROJECT-SETUP.md` §4). Runtime validation: Zod. Mocks: MSW v2, toggled by `NEXT_PUBLIC_USE_MOCKS`
- URL state (filters, search, pagination): `nuqs`. TanStack Query only for logged-in, client-interactive surfaces (§2)
- Forms: React Hook Form + Zod resolver, submitted via Server Actions
- Request interception: **`proxy.ts`** (Next 16 name; `middleware.ts` is deprecated)
- Error monitoring: none — `console.error` in error boundaries and `instrumentation.ts`
- Import aliases: `@/components/*`, `@/lib/*`, `@/styles/*`

### Folder structure — put new files here

```
app/[locale]/(public)/...    # public routes — layout sets lang + dir, skip link
app/api/revalidate/          # protected webhook → revalidateTag() (only if the backend can call it)
app/sitemap.ts · robots.ts   # public sites: generated from live API data
proxy.ts                     # locale negotiation, auth redirects, security headers
redirects.ts                 # old URL → new URL map, when replacing an existing site

components/ui/               # primitives (Button, Container…) — only place with Storybook stories
components/sections/         # composed blocks built from ui/
components/templates/        # page templates, 1:1 with the API's content types

lib/api/                     # client.ts (getPublic / getPrivate) + generated types (never hand-edit)
lib/schemas/                 # Zod schemas validating API responses at the boundary
lib/mocks/                   # MSW handlers + fixtures/ — ALL mock data, nowhere else
lib/security/                # secretMatches (constant-time), rateLimit + clientIp — server-only
lib/seo/                     # metadata builders + JSON-LD component
lib/i18n/                    # next-intl config + routing
lib/utils/                   # dates, numbers, slugs, DTO → view-model mappers — Vitest targets
lib/fonts.ts                 # next/font/local setup

messages/en.json · ar.json   # translations — every key in every locale
styles/tokens.css            # Tailwind v4 @theme — design tokens from Figma
public/assets/ · fonts/      # downloaded design assets, subsetted woff2
tests/e2e/                   # Playwright specs (every locale, redirects, axe)
docs/                        # PROJECT-SETUP.md, known-issues.md, ARCHITECTURE.md
docs/design/                 # screenshots, when there's no Figma (§7 Screenshots → code)
```

- A new page = a route in `app/[locale]/…` rendering a template from `components/templates/`, **plus a row in the §2 route table.**
- Promote to `components/ui/` once it's reused in 3+ places (rule of three) with content-agnostic props. Until then keep it in the section.
- Pure logic (formatting, DTO → view-model mapping) lives in `lib/`, never inside a component.

## 2. Rendering & data

**Rule: SSR by default. Cache every API response that is the same for all users. Never cache per-user or per-request data.**

- `getPublic(path, { schema, tags, revalidate })` — data identical for every visitor (content, menus, footer, settings, lookups). Cached with tags + a time limit; shared across requests.
- `getPrivate(path, { schema })` — per-user or per-request data. Never cached; forwards the session/auth.
- ⚙ Components never call `fetch` directly, so every data call is one of these two — the caching choice is explicit and reviewable.
- Stream slow sections with `<Suspense>`; don't `await` everything at the top of a page.
- Independent fetches run in parallel (`Promise.all`). Dedupe calls repeated in `generateMetadata` and the page with React `cache()`.
- Every API call has a timeout and an error/empty fallback — one slow endpoint must not hang the page.
- Static rendering only for pages with no API data (privacy, terms). `force-dynamic` is never applied globally.
- Content refresh: backend webhook → `/api/revalidate` by tag, with each response's time limit as the fallback

### Route table — fill as pages are planned; Claude builds each route to its row

| Route | Mode | Data (cache) | Refreshed by |
|---|---|---|---|
| *example* `/` | SSR | public: 10 min, tag `home` | webhook `home` |
| *example* `/news/[slug]` | SSR | public: 1 h, tags `news`, `news:{id}` | webhook `news:{id}` |
| *example* `/search` | SSR | results uncached; filter lookups public 1 h | — |
| *example* `/account` | SSR + client | private only (TanStack Query for interactions) | — |
| *example* `/privacy` | Static | none | redeploy |

Modes: **SSR** (default) · **SSR + client** (logged-in, interactive) · **Static** (no API data). Delete the example rows once real ones exist.

## 3. Hard rules

⚙ = enforced by ESLint (`eslint.project-rules.mjs`). Run `pnpm lint` and fix — don't disable.

- ⚙ Never import `@/lib/mocks/*` from `components/` or `app/`. Fixtures reach the UI only through MSW.
- ⚙ Components never call `fetch`. Use `getPublic` / `getPrivate` from `@/lib/api`.
- ⚙ No `dangerouslySetInnerHTML`. The API returns no rich-text HTML; if that changes, add a rehype pipeline in `lib/content` (`PROJECT-SETUP.md` §5.4). Only exception: the JSON-LD component in `lib/seo`.
- ⚙ No hardcoded container widths (`max-w-[1440px]`). Use `<Container>` or `CONTAINER_CLASSNAME`.
- ⚙ Every file in `lib/api/` and `lib/auth/` starts with `import "server-only"`, so importing it into client code fails the build.
- Never hand-edit generated API types — regenerate with `pnpm gen:types`.
- `components/templates/*` map 1:1 to the API's content types.
- ⚙ Every `components/ui` primitive ships with a `<Name>.stories.tsx` next to it, written in the same change: one story per state (default, hover/focus, disabled, error/loading where they apply) plus an **RTL** story (`globals: { direction: "rtl" }`) with Arabic text. `tests/unit/stories.test.ts` fails if one is missing; opt out only with a `// no-story: <reason>` comment for primitives with nothing visual (e.g. a screen-reader-only announcer).
- Keep `"use client"` as low in the tree as possible. Templates and sections stay Server Components.
- ⚙ No hex, px or spacing values outside `tokens.css` (lint catches them in Tailwind arbitrary values like `p-[13px]`, `bg-[#fff]`). A design value missing from tokens is a design inconsistency to raise — not a value to hardcode.
- Secrets never go in `NEXT_PUBLIC_*` variables — those are shipped to the browser.
- **No `app/[locale]/loading.tsx`** until the stack issue in `docs/known-issues.md` #1 is re-tested on the current Next.js version.
- Figma asset URLs expire (~7 days). Download to `public/assets/` immediately; never ship a Figma URL.
- **Git: never `git commit` or `git push` without the developer's explicit OK for that specific commit or push.** Approving a change is not approval to commit it, and an earlier OK doesn't cover the next one. Commit, then stop and ask again before pushing.
- No AI attribution in commit messages or PR descriptions — no `Co-Authored-By: Claude…`, no "Generated with Claude Code". ⚙ The `commit-msg` hook rejects them in commit messages; PR descriptions are on you.

## 4. Accessibility — a per-PR gate, not a pre-launch phase

Target: **WCAG 2.2 AA + Mada Center certification — budget a real Mada audit before launch**. An automated-clean report catches roughly a third of issues — it is not sign-off.

- Semantics: landmarks, one `<h1>` per page, no skipped heading levels, `<button>`/`<a>` — never `<div onClick>`.
- Any change to `components/sections` or `components/templates`: Tab / Shift+Tab through everything it touches before calling it done.
- Anything revealed on hover (accordion, dropdown, tooltip, panel group) must work on focus alone, and its ARIA pattern is decided when it's built — `aria-expanded` on a disclosure trigger, `role="tab"` + `aria-selected` for tabs — not retrofitted.
- The **first instance** of a reusable interactive pattern gets a full keyboard + screen-reader check before it's copied anywhere else.
- Page audits use the **`a11y-audit` skill**; whole-site Mada readiness uses **`mada-audit`** (`.claude/skills/`). Same steps, triage and report every time; never change a design token to fix contrast (record it in `docs/a11y-findings.md` for the designer). Neither is Mada certification.
- Visible focus on everything: one focus-ring token and `focus-ring` utility, consumed by every primitive. ⚙ Never `outline-none` — use `focus-ring`.
- ⚙ `jsx-a11y` strict runs on `components/` and `app/`.
- Route changes move focus to the `<h1>`/`<main>` and announce via an `aria-live` region; skip link is the first focusable element.
- Forms: associated `<label>`, errors via `aria-describedby` + `aria-invalid`, an error summary on submit, never colour alone.
- Contrast checked when tokens are defined: 4.5:1 text, 3:1 large text and UI boundaries — every colour pair the design uses is a row in `styles/contrast.test.ts`. Raise failures with the designer immediately.
- W3C markup validation (`html-validate`) is a CI gate; check a page on demand with the **`w3c-validate`** skill. CMS rich-text is the most likely source of invalid markup. Heading problems: **`heading-hierarchy`** skill — reusable blocks take their heading level from a prop, never hardcode it.

## 5. Performance — speed is a gate, like a11y

Targets at p75 on mid-range mobile: **LCP < 2.5s · INP < 200ms · CLS < 0.1 · TTFB < 800ms.** A regression is a bug, not a follow-up. (With SSR, server response time is part of the budget — see §2.)

### Loading & bundles

- ⚙ No CDN-hosted libraries (jsDelivr, cdnjs, unpkg). Install with pnpm so they're bundled and self-hosted.
- ⚙ No raw `<script src>`. Third-party scripts go through `next/script` with `strategy="lazyOnload"` or `"afterInteractive"`.
- Heavy client-only components (sliders, maps, video players, charts) via `next/dynamic`, imported by the page that uses them — not from a shared layout.
- Each library is imported once. Check a new dependency's cost with `ANALYZE=true pnpm build` and prefer a lighter option or a native API.

### Images & media

- ⚙ `next/image` only, never a raw `<img>`. Never serve original uploads. Large PNG / JPEG sources in `public/assets` → **`images-webp`** skill (never social-share images, icons or SVG).
- **LCP / hero image: `priority`, never lazy.** Everything below the fold stays lazy (the default). One or two `priority` images per page at most.
- Always reserve space: `width` + `height`, or `fill` inside a parent with a fixed `aspect-ratio`. Same for iframes, video, maps and banners.
- Always set `sizes`. AVIF/WebP via `images.formats` in `next.config.ts`. API image hosts registered in `images.remotePatterns`.
- Video: `preload="none"` (or `"metadata"`) plus a `poster`; never autoplay a heavy file above the fold.

### Fonts

- Self-hosted via `next/font/local` only (§7 Fonts) — no Google Fonts / Typekit `<link>`s.
- `woff2`, subset to the glyphs used (Arabic families especially), only the weights the design uses, `display: "swap"`, `preload` only above-the-fold weights.

### Client JavaScript

- Keep work on the server; `"use client"` only for real interaction.
- Never build hundreds of DOM nodes at once — paginate, virtualise, or render in batches (e.g. 20 per `requestAnimationFrame`).
- No nested loops over large data: compute lookups once, on the server or with `useMemo`.
- Effects run once: correct dependencies plus cleanup (Strict Mode double-runs effects in dev — cleanup must make that harmless).
- Scroll / resize / pointer: prefer CSS or `IntersectionObserver`. If a listener is unavoidable: attach once, `{ passive: true }`, throttle to one run per `requestAnimationFrame`.
- Wait for the element or data (ref callback, effect, promise) — never a fixed `setTimeout`.
- Keep INP low: split any input-driven task over ~50ms (heavy filtering, sorting) — move it to the server or yield between chunks.

### API payloads — raise with the backend team if violated

- Only the fields the UI uses. Shared objects referenced by ID, not repeated. Related records in one call — no N+1.

## 6. Security — a per-PR gate, like a11y

The backend owns authorisation, but our server and pages are attack surface too. How to test each rule: `docs/PROJECT-SETUP.md` §11.

### Forms & anything that writes

- Every Server Action and write route handler validates input **on the server** with the same Zod schema as the client, and checks the session and permission **inside the action itself**. A Server Action is a public POST endpoint — a hidden page or button protects nothing.
- Route handlers that accept cookie-authenticated writes check the `Origin` header (Server Actions do this automatically).
- Public forms (contact, login, sign-up, password reset) get abuse protection: `rateLimit()` per IP (`lib/security/rate-limit.ts`) plus a honeypot field, and a captcha only if that isn't enough.
- Captcha, when needed: one with **no visual challenge** — reCAPTCHA v3, Cloudflare Turnstile or similar — never image puzzles, which fail WCAG and Mada (§4). The token is **verified on the server** inside the action, with the provider's secret key; a low score falls back to the honeypot + rate limit, never to a puzzle. The token format is agreed with the backend before building.
- Errors shown to users are generic; details go to the server logs. Never render a stack trace, SQL or raw backend message. Login and reset errors never reveal whether an account exists.
- File uploads: allowlist of types and a max size, checked on the server (not just `accept=`). Never serve an upload back from our own origin as-is.
- Every Server Action and write route handler gets a test that calls it **logged out** and **with invalid input** and expects a refusal — written with the action, not later.

### Webhooks (`app/api/revalidate`, and any endpoint a backend calls)

- Use the template's `app/api/revalidate/route.ts` — don't write a new one. It: accepts **POST only**; reads the secret from the `X-Revalidate-Secret` **header** (never a query string — URLs get logged); compares with `secretMatches()` (constant-time — never `===`); refuses when the env secret is unset; requires JSON; caps the body at 4 KB; validates tags against a strict pattern; rate-limits per IP; never logs the secret or headers. `tests/unit/revalidate.test.ts` checks each of these.
- Any other inbound webhook follows the same list.

### Rate limiting — decide per project

- `rateLimit()` is **in-memory, per instance**. Fine on one server or container. On several containers or serverless instances each keeps its own count — use the CDN / WAF's rate limiting, or back `rateLimit()` with a shared store (Redis, a KV). Record the choice in §10 (hosting).
- `clientIp()` trusts `X-Forwarded-For`, which is only safe when the platform / CDN overwrites it.

### Every page

- ⚙ No `dangerouslySetInnerHTML` (§3). URL params and search terms render as text, never as HTML.
- Security headers set in `proxy.ts`: CSP (report-only first, enforced before launch), HSTS, `X-Content-Type-Options: nosniff`, `Referrer-Policy`, `Permissions-Policy`, `frame-ancestors`.
- Private pages send `Cache-Control: private, no-store`.
- Staging is behind a login or IP allowlist, and `noindex`.

### Code & secrets

- ⚙ `import "server-only"` at the top of `lib/api/*`, `lib/auth/*`, `lib/security/*` (lint-enforced) and any other module that reads a secret env var.
- Secrets never in `NEXT_PUBLIC_*` and never committed; `.env.local` stays gitignored. ⚙ secretlint blocks them at commit (`pnpm secrets` scans every tracked file).
- New dependency: maintained, and `pnpm audit --prod` clean. No `eval`, `new Function` or HTML built from strings.
- No public source maps in production (`productionBrowserSourceMaps` stays off).

## 7. Conventions

### i18n & RTL

- ⚙ Logical properties only (`ps-`, `pe-`, `ms-`, `me-`, `start-`, `end-`, `text-start`, `rounded-s`, `border-e`), never `pl-`/`pr-`/`left-`/`right-`/`text-left`. `dir` + `lang` set on `<html>` per locale.
- Every translation key goes into every `messages/*.json` (`lib/i18n/messages.test.ts` checks). ⚙ No hardcoded UI strings. Keys are typed — a wrong `t()` key fails `pnpm typecheck`.
- `lang` on inline opposite-language runs. Dates and numbers through `lib/utils` formatters (numeral system and calendar decided once — §10).

### Responsive — fluid tokens, not breakpoint jumps

For anything that visibly scales (spacing, font size, icon size):

- Define a `clamp()` token in `tokens.css` — generate it with `pnpm token:clamp <minPx> <maxPx> <minVw> <maxVw> --name=--token`, don't hand-calculate. The maths: `slope = (max−min)/(vMax−vMin)`, `intercept = min − slope×vMin`, value = `clamp(min, intercept + slope×100vw, max)`. Comment the range: `/* 14px @1400 → 18px (Figma) @1920 */`
- Apply via `var()`: `px-[var(--spacing-nav-item-x)]`, `text-[length:var(--text-nav-item)]`. Never inline the clamp string in a component.
- Hard collapse points (desktop nav → drawer) get a named breakpoint token (`--breakpoint-nav: 87.5rem` → `nav:` variant), set after measuring overflow in the browser (`scrollWidth` vs `clientWidth`) with a safety margin — don't guess `lg`/`xl`.
- Simple on/off switches (`hidden nav:flex`) can use plain breakpoint classes.
- Minimum test width 320px, in every locale.

### Laptop scaling — one rule, not a media query per screen

- Display scaling narrows the viewport: a 1920 laptop at 125% is **1536** CSS px, 150% → **1280**, 175% → ~1097, 200% → 960. Fixed sizes from a 1920 design then look oversized.
- `styles/scaling.css` (imported by `app/globals.css`) scales the **root font size** 16 px @1920 → 13 px @1280, 13 px floor down to 1024, normal 100% below that. Tailwind sizes text, spacing and gaps in `rem`, so they all follow. **Never add per-screen media queries to shrink sizes** — fix the scale instead.
- Units: **`rem`** for page-level sizes (text, spacing, layout) · **`em`** for padding / icons inside a component that should follow its own text size · **`px`** only for hairlines (1 px borders, outlines). ⚙ Raw `px` in Tailwind brackets is already blocked — it wouldn't scale.
- Never shrink by `devicePixelRatio`, CSS `zoom`, `transform: scale()` or a viewport meta trick. People choose 175–200% because they need it; browser zoom must still enlarge everything (WCAG 1.4.4 / 1.4.10, Mada). 200% scaling (960 px) correctly gets the tablet layout at full size.
- Sizes that need their own curve (a 64 px hero title) get a `clamp()` token on top. Expect a step at 1024 px — that's where tablet layout becomes desktop.
- Different design frames (e.g. a 1440 laptop frame)? Recalculate the range with `pnpm token:clamp`, in `styles/scaling.css` only.

### Fonts

- Files in `public/fonts/`, loaded in `lib/fonts.ts` with `next/font/local`, using a `-local` variable name (`--font-brand-local`).
- Bridge in `tokens.css`: `--font-brand: var(--font-brand-local), system-ui, sans-serif;`
- Apply the font's `.variable` on `<html>` in the root/locale layout — not `<body>`.
- If a section uses one weight, set it once on the section root, not per text node.

### Container width

Width lives only in `--container-max-w` (`tokens.css`) and `components/ui/Container.tsx`. Use `<Container>` for a plain wrapper; when a component owns its wrapper element, merge `CONTAINER_CLASSNAME` via `cn()`.

### Interactive states

- Hover, focus and open states are built once in shared primitives and reused — never hand-rolled per component.
- Drive them from one `group` on the `<a>`/`<button>`: children use `group-hover:` **and** `group-focus-visible:` (plus `group-aria-expanded:` for triggers that open a panel), so keyboard users get the same feedback as mouse users.
- Indicators (underlines, bars, fills) must contrast with the surface they sit on — never the surface's own colour.
- Animate transform/opacity only; respect `prefers-reduced-motion` in the shared animation config.

### Figma → code

- Tokens first, then `components/ui` primitives, then pages.
- Read one node at a time (file key + node ID of the specific frame).
- Figma gives layout, not semantics — add heading levels, landmarks, alt text, RTL and keyboard behaviour yourself.
- HTML-sourced pages are rebuilt, not pasted: extract content, reuse existing `components/ui` / `sections`, rebuild the rest against tokens.

### Screenshots → code (no Figma)

- Screenshots live in `docs/design/` — one file per page and breakpoint (`home-desktop.png`, `home-mobile.png`). Read one at a time, like a Figma node.
- Tokens first: propose `tokens.css` from the screenshots, mark every value `/* estimated from screenshot */`, and list them for the developer to confirm with the client. Exact brand colours and fonts from a brand guide always win over estimates.
- What a screenshot doesn't show — RTL, missing breakpoints, hover / focus / open / error states — is designed from the shared primitives, not invented per page. Say what you assumed.
- Never crop images or icons out of a screenshot for the build; ask for the original files and use a reserved-space placeholder until they arrive.

## 8. Before saying a task is done

- [ ] `pnpm lint`, `pnpm typecheck` and `pnpm test` pass; `pnpm test:e2e` for page/layout changes (add new templates to `PAGES` in `tests/e2e/pages.ts`)
- [ ] Checked in every locale, at 320px, tablet and desktop
- [ ] Keyboard pass on anything interactive (§4)
- [ ] No new raw hex / px / width values outside `tokens.css`
- [ ] Empty, loading and error states exist — not just the happy path
- [ ] New route: its §2 table row exists, and it uses `getPublic` / `getPrivate` accordingly
- [ ] New or changed page: LCP image has `priority`, every image/embed has reserved space, no new external domains in the Network tab
- [ ] Speed-related change: Lighthouse mobile (throttled) before and after, numbers in the PR
- [ ] Anything that writes (form, Server Action, route handler): server-side Zod validation and a session/permission check inside it — tested by calling it directly while logged out and with bad data (§6)
- [ ] No secrets or internal hostnames in the client bundle; new dependencies pass `pnpm audit --prod`

## 9. Known issues — details in `docs/known-issues.md`

One line per open issue: what to avoid, and when it can be lifted. Remove the line when resolved.

- **`loading.tsx` at `app/[locale]`** can hang the route on Next 16 + Turbopack + next-intl (#1). Re-test on the current version before adding one.
- **Empty `nuqs`-wrapped sections in `next dev` only** (#2). Check a production build before treating it as a bug.
- **TypeScript 7 / ESLint 10 crash `pnpm lint`** (#3). Keep the majors `create-next-app` installs (TS 5.9, ESLint 9); don't upgrade either until `typescript-eslint` and `eslint-plugin-react` support it.

## 10. Open decisions — flag if a task depends on one

- [ ] Supported browser matrix
- [ ] Hosting target (Node server / container / platform) and who owns the pipeline — and whether it runs one instance or several, which decides how rate limiting works (§6)
- [ ] Auth method and session storage for the visitor portal — when decided, add `app/[locale]/(app)/`, `lib/auth/` and the Login & sessions rules (`PROJECT-SETUP.md` §4, §11)
- [ ] Preview / draft-content workflow needed?
- [ ] Site search scope
- [ ] Numerals and calendar per locale (e.g. Western vs Eastern Arabic numerals, Gregorian vs Hijri)
- [ ] Who reviews each language's content
- [ ] Security requirements in the contract: pen test (who runs it, when), Qatar NIA compliance for government projects, abuse protection for public forms (rate limit vs captcha)

Move an item into the relevant rule section once it's decided.

## 11. Status & TODO

Built: scaffold only (2026-10-11). The `app/` directory is the source of truth for what exists.

Not in place yet — don't assume these run:

- [ ] Per project, once the spec URL exists: add `pnpm types:check` to the PR pipeline (generated API types must match the backend's current spec)
- [ ] Lighthouse CI budgets (§5 targets + JS bundle size per route) on the main templates in the PR pipeline — warnings first (shared agents are noisy), failing only on large regressions
- [ ] Renovate for dependency updates (projects are on Azure DevOps, where Dependabot isn't built in)
- [ ] Per project: `azure-pipelines.pr.yml` registered and set as a **required** Build validation on `main`/`development` — until then the PR gate (lint, typecheck, Vitest, audit, Playwright + axe + html-validate) doesn't block anything
- [ ] If deployed as a container: `output: "standalone"` and a `HEALTHCHECK` that requests a real route
