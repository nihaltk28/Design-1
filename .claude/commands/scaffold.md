---
description: Set up a new project from the team template — asks the project questions, fills CLAUDE.md, creates the Next.js app, folders and starter files.
argument-hint: "[optional: short project description]"
---

You are setting up a **new project** from the team's Next.js template in this folder. Follow `CLAUDE.md` and `docs/PROJECT-SETUP.md` (Sections 3, 4 and 13) exactly. Extra context from the user: $ARGUMENTS

## Step 0 — Check this is a clean template

- `CLAUDE.md` must still start with `# {{PROJECT_NAME}}` and contain the "Team template" note, and there must be no `package.json` or `node_modules/` yet. (The template ships a few files under `app/`, `lib/` and `tests/` — that's expected.)
- If not, **stop** and tell the user: this folder isn't a fresh template (already scaffolded, or an old project's files are here). Ask them to start from a clean copy of the template.

## Step 1 — Ask the project questions

**Every new project starts blank.** Ask each question fresh and wait for the user's answers:

- **Never pre-fill answers** from earlier in this conversation, from older versions of `CLAUDE.md`, git history, other folders or any previous project — even if you've seen one. The only defaults allowed are the ones written in the list below.
- Don't guess the project name from the folder name.
- If an answer is missing or unclear, ask again — don't assume.

Ask these in one go (use the question tool if available). Don't start building until all are answered.

1. Project name (used in the `CLAUDE.md` title and `package.json`)
2. One-line description
3. Backend: .NET / Laravel / WordPress / Drupal / other — and API style: REST/JSON or GraphQL
4. Backend owner (name or team)
5. API spec URL (OpenAPI/Swagger or GraphQL endpoint), or "not available yet"
6. Audience: public site / logged-in portal / both
7. Does it have login? (yes/no)
8. Languages and default (default: `en` + `ar`, default `en`; single language = no `[locale]` segment and no next-intl)
9. Qatar government project needing Mada certification? (yes/no)
10. Replacing an existing site that needs URL redirects / SEO parity? (yes/no)
11. Does the backend return rich-text HTML (CMS body fields)? (yes/no)
12. Can the backend call a webhook when content is published? (yes/no/unknown)
13. Error monitoring: Sentry (budget approved) / none
14. Form submissions: Server Actions / route handlers (default: Server Actions)
15. Design source: Figma link / existing HTML / screenshots only / a mix

## Step 2 — Show the plan, wait for approval

Summarise: the filled `CLAUDE.md` "Project" values, the types source and refresh strategy chosen from `PROJECT-SETUP.md` §4, packages to install (and which optional ones are skipped), and the files you'll create. Wait for the user to approve before changing anything.

## Step 3 — Fill `CLAUDE.md`

- Replace every `{{…}}` placeholder using the answers and the `PROJECT-SETUP.md` §4 backend table. Remove the HTML comments that explained the placeholders.
- `{{MONITORING}}` appears twice. In §1 write the full choice (e.g. "Sentry" or "none — `console.error` in error boundaries and `instrumentation.ts`"); in §6 write just where error details go ("Sentry" or "the server logs") — the sentence reads "details go to Sentry" / "details go to the server logs".
- Delete the "Team template" note at the top.
- Mada = no → remove the Mada wording. Single language → remove the `[locale]`/next-intl lines and adjust the folder tree.
- No login → remove `app/[locale]/(app)`, `lib/auth/`, the "Auth method" open decision and the "Login & sessions" subsection of `CLAUDE.md` §6. No rich-text HTML → remove `lib/content/` and the rehype install. No webhook → `app/api/revalidate` is not created and refresh strategy is "time-based revalidate only".
- Keep the example rows in the §2 route table; tell the user to replace them as pages are planned.
- Afterwards, `grep -n "{{" CLAUDE.md` must return nothing.

## Step 4 — Create the app

**Files the template already ships — keep them, never overwrite:** `CLAUDE.md`, `README.md`, `CHANGELOG.md`, `docs/`, `.claude/`, `.husky/`, `.azuredevops/`, `.storybook/`, `scripts/`, `lib/` (including `lib/security/`), `app/api/revalidate/`, `styles/`, `tests/`, `app/[locale]/[...rest]/`, `.gitignore`, `.prettierrc.json`, `.env.example`, `.htmlvalidate.json`, `.secretlintrc.json`, `.secretlintignore`, `eslint.project-rules.mjs`, `lint-staged.config.mjs`, `next.config.ts`, `playwright.config.ts`, `vitest.config.mts`, `azure-pipelines.pr.yml`.

1. **Create the Next.js app in a temp folder** (`create-next-app` refuses a non-empty folder, and must not create a second git repo):
   ```bash
   pnpm create next-app@latest ../tmp-app --typescript --tailwind --eslint --app --use-pnpm --no-src-dir --import-alias "@/*" --disable-git --yes
   ```
   Copy **only these** into this folder: `package.json`, `pnpm-lock.yaml`, `pnpm-workspace.yaml`, `tsconfig.json`, `postcss.config.mjs`, `eslint.config.mjs`, `app/globals.css`, `app/favicon.ico`. Then delete `../tmp-app`. Don't copy its `app/layout.tsx` / `app/page.tsx` (they'd conflict with `app/[locale]/layout.tsx` as the root layout), `public/*.svg`, `README.md`, `.gitignore`, `next.config.ts`, or any `CLAUDE.md` / `AGENTS.md`.
2. **Install packages** per `PROJECT-SETUP.md` §13, skipping optional ones the answers ruled out. Install Sentry only if the answer was yes (`npx @sentry/wizard@latest -i nextjs`). GraphQL backend → `@graphql-codegen/cli` instead of `openapi-typescript`. Never install `typescript` or `eslint` without a version — keep the majors create-next-app wrote (`docs/known-issues.md` #3). Also `pnpm add -D @types/node@<node major>` (create-next-app pins an older major that Vitest rejects). **Before installing anything**, add `saveExact: true` to `pnpm-workspace.yaml` (pnpm 11+ ignores `save-exact` in `.npmrc`) so every `pnpm add` is exact. Afterwards remove the `^` from the entries create-next-app wrote and from `@types/node` (an explicit version range keeps its `^` even with `saveExact`), so every version in `package.json` is pinned; re-run `pnpm install`.
3. **pnpm build-script approvals.** pnpm 10+ blocks dependency build scripts and exits with `ERR_PNPM_IGNORED_BUILDS`, writing placeholders into `pnpm-workspace.yaml` → `allowBuilds`. Set each listed package to `false` (none are needed to build or test this stack) and re-run the install; `sharp` only needs `true` if image optimisation fails at runtime.
4. **Storybook:** don't run `storybook init` — it installs a different framework and extra addons and overwrites `vitest.config.mts`. The template's `.storybook/main.ts` and `preview.tsx` are the whole setup.
5. **ESLint:** add `...projectRules` (from `./eslint.project-rules.mjs`) as the **last** entry of the generated `eslint.config.mjs`, and add `playwright-report/**`, `test-results/**`, `storybook-static/**`, `coverage/**`, `public/mockServiceWorker.js` to its `globalIgnores`. The rules file relies on `eslint-config-next` registering the `jsx-a11y` and `react` plugins — don't register them again. Run `chmod +x .claude/hooks/lint-changed.sh`.
6. **`package.json`:** add the scripts from `PROJECT-SETUP.md` §17 (put the real spec URL in `gen:types`, or a clear TODO that exits 1), plus `"engines": { "node": ">=<current major>" }` and `"packageManager": "pnpm@<installed version>"`. Set `NODE_VERSION` and `PNPM_VERSION` in `azure-pipelines.pr.yml` to the same majors.
7. **Git hooks:** **don't run `npx husky init`** — it overwrites the template's hooks. The `prepare: husky` script installs them on later installs, but `pnpm install` skips it when nothing changed — so run `pnpm exec husky` once now and check `git config core.hooksPath` prints `.husky/_`.
8. **Env:** create `.env.local` from the template's `.env.example` (`NEXT_PUBLIC_USE_MOCKS=true`). Confirm `.env.local` is gitignored and `.env.example` is not.
9. **Single-language project:** in `next.config.ts` remove the next-intl plugin; delete `app/[locale]/[...rest]/` and add a root `app/not-found.tsx`.

## Step 5 — Create folders and starter files

The template already ships `lib/api/client.ts` (getPublic / getPrivate, timeouts, Zod, typed errors, MSW started lazily so it also works during `next build`), `lib/api/errors.ts`, `lib/mocks/server.ts`, `app/[locale]/[...rest]/page.tsx` (real 404 for unknown paths), and the test files in `tests/`. Keep them; adapt only where an answer requires it.

Create every other folder in `CLAUDE.md` §1 "Folder structure" that applies, with minimal, working starter files — no placeholder lorem pages:

- `app/[locale]/layout.tsx` — the root layout: sets `lang` and `dir` (via `directionOf`), applies `fontVariables` from `lib/fonts.ts` on `<html>`, skip link to `#main` as first focusable element, `<main id="main">`, route-change focus + `aria-live` announcer, `generateStaticParams` for the locales
- `app/[locale]/(public)/page.tsx` — a simple home page proving the pipeline: one `<h1>`, renders one mocked value via `getPublic`
- `app/[locale]/not-found.tsx`, `error.tsx`, `app/global-error.tsx` — real 404/500 behaviour; `console.error` unless Sentry was chosen
- **No `app/[locale]/loading.tsx`** (`docs/known-issues.md` #1)
- `instrumentation.ts` — `onRequestError` logging (or Sentry). MSW is **not** started here — `lib/api/client.ts` does it
- `proxy.ts` — locale negotiation (next-intl) + security headers (`PROJECT-SETUP.md` §11; CSP in report-only mode to start). `tests/e2e/smoke.spec.ts` checks for: `content-security-policy-report-only`, `strict-transport-security`, `x-content-type-options`, `referrer-policy`, `permissions-policy`, `x-frame-options`
- `lib/seo/site.ts` — `siteUrl()` and `isProductionSite()` from `SITE_URL` / `SITE_ENV`; `lib/seo` metadata builder + JSON-LD component (the one allowed `dangerouslySetInnerHTML`)
- `app/sitemap.ts`, `app/robots.ts` — public sites only; `robots` disallows everything unless `isProductionSite()`
- Webhook = yes: keep the template's hardened `app/api/revalidate/route.ts` and `tests/unit/revalidate.test.ts` unchanged (tell the user the backend must send `POST` with an `X-Revalidate-Secret` header and `{ "tags": [...] }`). Webhook = no/unknown: delete both. Always keep `lib/security/` and `tests/unit/security.test.ts`
- `lib/mocks/handlers.ts`, `browser.ts`, `fixtures/` — one stub endpoint used by the home page. `browser.ts` needs the service worker: run `pnpm exec msw init public --save`. Handlers match any origin (`http.get("*/site/settings", …)`) so they work with the mock base URL and a real `API_BASE_URL`
- `lib/i18n/routing.ts` exporting `routing`, `Locale`, `RTL_LOCALES` and `directionOf(locale)` (the smoke test imports them); `lib/i18n/request.ts`, `navigation.ts`; `messages/<locale>.json` for every locale with the same keys
- `global.d.ts` — typed translation keys, so a wrong key fails `pnpm typecheck`:
  ```ts
  import type { routing } from "@/lib/i18n/routing";
  import type messages from "./messages/<DEFAULT_LOCALE>.json";
  declare module "next-intl" {
    interface AppConfig { Locale: (typeof routing.locales)[number]; Messages: typeof messages }
  }
  ```
- `lib/fonts.ts` — export `fontVariables` (an empty string until fonts arrive) plus a commented `next/font/local` example. The layout applies `fontVariables` on `<html>`, so nothing changes there when real fonts land
- `styles/tokens.css` — `@theme` with clearly-marked placeholder tokens: colours (at least the names `styles/contrast.test.ts` checks: `--color-text`, `--color-text-muted`, `--color-surface`, `--color-brand`, `--color-on-brand`, `--color-focus-ring` — placeholder values must pass it), type scale, spacing, radii, a focus-ring token, `--container-max-w`; plus `@utility focus-ring { … }` built from the focus-ring token (the lint rules reject `outline-none` and point here)
- `app/globals.css` — **replace** the generated file (it has hex values, Geist font variables, a dark-mode `:root` override and `font-family: Arial`, which break the token rules) with `@import "tailwindcss"; @import "../styles/tokens.css"; @import "../styles/scaling.css";` and a `@layer base` `body` rule that uses only tokens
- `components/ui/Container.tsx` exporting `Container` and `CONTAINER_CLASSNAME`, plus `components/ui/Container.stories.tsx` (default + RTL story, per `CLAUDE.md` §3), and `lib/utils/cn.ts`. Any other `components/ui` file gets a story too, or a `// no-story: <reason>` comment (e.g. a screen-reader-only route announcer)
- Login = yes: `lib/auth/session.ts` (`import "server-only"`) with `getSession()` reading the httpOnly session cookie, and a `proxy.ts` redirect for `(app)` routes — a placeholder until the auth decision (`CLAUDE.md` §10) is made
- `lib/content/` rehype pipeline skeleton — only if the API returns rich-text HTML
- Keep the template's tests: `lib/i18n/messages.test.ts`, `styles/contrast.test.ts`, `tests/unit/stories.test.ts`, `tests/unit/security.test.ts`, `tests/unit/revalidate.test.ts` (webhook projects), `tests/e2e/{pages,layout.spec,markup.spec,smoke.spec}.ts`. Single-language project: delete `messages.test.ts`; in the specs replace `routing.locales` with `[""]`, fix `url()` in `pages.ts` to drop the locale segment, and drop the `dir`/redirect assertions from `smoke.spec.ts`.

**Build note:** with `generateStaticParams`, locale pages are prerendered at build time, so a real (non-mock) build needs `API_BASE_URL` to be reachable from the build machine.

## Step 6 — Verify

Run each and fix anything that fails: `pnpm lint --max-warnings=0`, `pnpm typecheck`, `pnpm exec vitest run`, `pnpm build`, `pnpm exec storybook build --quiet` (then delete `storybook-static/`), `pnpm test:e2e`, `pnpm audit --prod`, `pnpm secrets`. Then:

- Update `CLAUDE.md` §11: "Built: scaffold only (date)".
- Replace the template `README.md` with a short project README (what it is, first-run commands from `PROJECT-SETUP.md` §17, pointer to `CLAUDE.md`, and a line "Created from nextjs-starter on <date>" so the team can check the template's `CHANGELOG.md` for later improvements). Delete the template's `CHANGELOG.md` from the project.
- **Don't commit.** Ask the developer first (`CLAUDE.md` §3).
- Report to the user: what was created, what was skipped and why, and the next steps — fill the §2 route table and `PROJECT-SETUP.md` §16 page inventory, add real design tokens (and their pairs in `styles/contrast.test.ts`), set the spec URL, and **make the PR pipeline required**: register `azure-pipelines.pr.yml` in Azure DevOps and add it as a required Build validation on `main`/`development` (steps at the top of the file — needs portal access, so the user does it).
