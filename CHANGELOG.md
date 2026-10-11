# Template changelog

Changes to the `nextjs-starter` template. Projects created earlier don't get these automatically — check here and copy across what's useful.

## 2026-10-08

### Added
- Laptop scaling: `styles/scaling.css` scales the root font size 16 px @1920 → 13 px @1280 (13 px floor to 1024, normal below), so every rem-based Tailwind size follows display scaling at 125–175% without per-screen media queries. Rules in `CLAUDE.md` §7; `/scaffold` imports it. Layout test widths now 320 / 768 / **1280 / 1536** / 1920.
- Skills `mada-audit` (site-wide readiness sweep + site-level checklist), `w3c-validate`, `seo-audit`, `heading-hierarchy`, `images-webp` — each with a script, tested against pages with planted problems in English and Arabic. `sharp` added to the install list (the WebP skill needs it as a direct dependency).
- Skill `a11y-audit` (`.claude/skills/a11y-audit/`): page-by-page WCAG 2.2 AA / Mada audit with a fixed method, triage and report, generalised from COM-React's `mada-audit`. `audit.mjs` runs the automated half with the project's own Playwright + axe (no CDN) — tested on a page with 10 planted bugs: all caught at 320 px and desktop.
- Hardened CMS webhook shipped in the template: `app/api/revalidate/route.ts` — POST only, secret in a header with a constant-time check, refuses when the secret is unset, JSON only, 4 KB cap, strict tags, rate limit, immediate `revalidateTag(tag, { expire: 0 })`.
- `lib/security/`: `secretMatches()` (constant-time) and `rateLimit()` / `clientIp()`; lint requires `server-only` there.
- Tests: `tests/unit/security.test.ts`, `tests/unit/revalidate.test.ts` (12 tests).
- Rules and guides: webhook hardening, rate limiting per hosting type (single vs multi-instance), accessible captcha with server-side verification, server-side sanitising over DOMPurify (`CLAUDE.md` §6, `PROJECT-SETUP.md` §11).
- Known issue #3: TypeScript 7 / ESLint 10 crash `pnpm lint`.

## 2026-10-07

### Added
- README: three ways to create a project (GitHub *Use this template*, Azure DevOps import, SSH `degit` for the private repo), naming rule (no spaces), and a troubleshooting table for the setup errors hit on the first real project.
- Design source "screenshots only": `/scaffold` option and a *Screenshots → code* section in `CLAUDE.md` §7.

### Fixed
- `review/` (leads' current-state review and AI assets) moved out of the template — it isn't a project file, and new projects copy the template's first commit.
- The README's `npx degit owner/repo` command failed on the private repo — replaced with the SSH form.
- Docs said `/scaffold` asks ~13 questions; it asks 15.

## 2026-09-29 (dry-run fixes)

A dry run of `/scaffold` found 19 problems; all fixed.

### Added
- Tested files shipped in the template instead of described in prose: `lib/api/client.ts`, `lib/api/errors.ts`, `lib/mocks/server.ts`, `app/[locale]/[...rest]/page.tsx` (real 404s), `tests/e2e/smoke.spec.ts`, `playwright.config.ts`, `vitest.config.mts`, `next.config.ts`, `.storybook/`, `.prettierrc.json`, `.env.example`, `tests/empty.ts`.
- `/scaffold` asks for the backend owner and whether there's login.

### Fixed
- HTML validation now loads `.htmlvalidate.json` and allows Next.js's own markup.
- Build on mocks: MSW starts from the API client, so it also runs in `next build` workers.
- e2e no longer hangs after the last test, no longer deletes the unit-test results, and uses port 3100 so it can't test another app.
- `typecheck` works on a clean checkout (`next typegen` first).
- Our config files no longer fail lint with `--max-warnings=0`.
- Safe `create-next-app` steps: no second git repo, explicit list of files to copy, `.gitignore` kept.
- `next dev` no longer edits `CLAUDE.md` (`agentRules: false`).
- No `storybook init`; pnpm build-script approvals, `jsdom` and `@types/node` covered; pipeline on pnpm 12.
- `pnpm secrets` scans every tracked file, dotfiles included.
- Lint class rules also apply to `lib/content`.
- Storybook: every `components/ui` primitive must have a `.stories.tsx` (default, states, RTL) — enforced by `tests/unit/stories.test.ts` on commit and PR; LTR / RTL toolbar switch in `.storybook/preview.tsx`.
- Second dry run: exact versions via `saveExact` in `pnpm-workspace.yaml` (pnpm ignores `.npmrc` for this), Husky hooks installed during scaffold, generated `globals.css` replaced, MSW service worker step, wording fixes.

## 2026-09-29

### Added
- `docs/ARCHITECTURE.md`: one-page overview for the team and leads, including what's automated and what's manual.
- Security rules (`CLAUDE.md` §6) and a check-by-check test guide (`docs/PROJECT-SETUP.md` §11).
- Lint rules: logical RTL classes only, no raw hex/px in Tailwind values, no `outline-none`, strict `jsx-a11y`, no hardcoded JSX text, `import "server-only"` required in `lib/api` and `lib/auth`.
- Tests: translation key parity (`lib/i18n/messages.test.ts`), token contrast (`styles/contrast.test.ts`), layout overflow + axe at 320/768/1440 (`tests/e2e/layout.spec.ts`), HTML validation (`tests/e2e/markup.spec.ts`).
- Git hooks: pre-commit (lint-staged, secretlint) and commit-msg (rejects AI attribution).
- Azure DevOps PR pipeline (`azure-pipelines.pr.yml`) and PR template (`.azuredevops/pull_request_template.md`).
- `pnpm token:clamp` for fluid tokens, `pnpm secrets`, `pnpm types:check`.
- Rule: Claude asks the developer before every commit and every push (`CLAUDE.md` §3).

### Changed
- `CLAUDE.md` sections renumbered: Security is §6; Conventions → §7, Before done → §8, Known issues → §9, Open decisions → §10, Status → §11.
