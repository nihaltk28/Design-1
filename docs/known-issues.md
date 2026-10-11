# Known issues & incident history

Background for the one-line rules in `CLAUDE.md` §9. When something breaks and you find the cause, add an entry here and a one-line rule there. When it's resolved, mark it **Resolved** with the date and remove the `CLAUDE.md` line.

Entries #1–#2 are **stack-level** — found on an earlier project using the same stack (Next.js 16 + Turbopack + next-intl + nuqs) and carried into the template. Re-test them after each Next.js upgrade; project-specific entries start at #3.

### Entry format

```
## N. Short title
**Status:** Open | Fixed — rule remains | Resolved YYYY-MM-DD · **Found:** YYYY-MM-DD
**Symptom:** what you see
**Cause / trigger:** what actually causes it, if known
**Tried:** what didn't work (so nobody repeats it)
**Rule:** what to do or avoid — mirrored as one line in CLAUDE.md §9
**Lift when:** the condition that makes the rule unnecessary
```

---

## 1. `app/[locale]/loading.tsx` hangs the route

**Status:** Open — framework bug (stack-level)

**Symptom:** With `loading.tsx` present, the route's implicit Suspense boundary shows the fallback and never swaps it for the real page. No console error.

**Scope:** Reproduced in both `next dev` and production (`next build && next start`).

**Trigger (bisected):** Next.js 16 + Turbopack + next-intl (`next/root-params`), with a `"use client"` component calling `useTranslations` while rendering 5+ mapped items, each containing nested `<span>`s. Fewer items or a shallower structure didn't reproduce it.

**Root cause:** Inside Next.js/Turbopack's handling of that boundary — not fixable from application code.

**Rule:** No `loading.tsx` at `app/[locale]`. Render loading states inside the page/component tree (`<Suspense>` around the slow section).

**Lift when:** A Next.js 16.x release note confirms the fix and the trigger above no longer reproduces in this project.

---

## 2. `nuqs` Suspense boundary renders empty in dev

**Status:** Open — dev-only (stack-level)

**Symptom:** A client component using `nuqs` (wrapped in the `<Suspense fallback={null}>` that `useSearchParams` requires) renders as an empty area in `next dev`. No console error.

**Relation to #1:** Same underlying boundary issue, narrower trigger.

**Scope:** Dev only — production builds render correctly.

**Rule:** Before treating an empty `nuqs`-driven section as a bug, check a production build.

**Lift when:** It no longer reproduces in `next dev` after a Next.js or nuqs upgrade.

---

## 3. TypeScript 7 and ESLint 10 break the lint setup

**Status:** Open (stack-level) · **Found:** 2026-10-08

**Symptom:** `pnpm lint` crashes before checking anything:
- TypeScript 7 → `typescript-eslint does not support TS 7.0`
- ESLint 10 → `Error while loading rule 'react/display-name': contextOrFilename.getFilename is not a function`

**Cause / trigger:** `pnpm add -D typescript` or `eslint` without a version installs the newest major. `typescript-eslint` (used by `eslint-config-next`) doesn't support TS 7 yet, and `eslint-plugin-react` doesn't support ESLint 10 yet. `create-next-app` (Next 16.3) installs TypeScript 5.9 and ESLint 9, which work.

**Tried:** TypeScript 6 with ESLint 10 — still fails on the React plugin.

**Rule:** Keep the TypeScript and ESLint majors `create-next-app` installs (TS 5.9, ESLint 9). Never upgrade either major on its own — check that `typescript-eslint` and `eslint-plugin-react` support it first.

**Lift when:** `typescript-eslint` supports TS 7 and `eslint-plugin-react` supports ESLint 10, and `pnpm lint` passes on a test project with both.
