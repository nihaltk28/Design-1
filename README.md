# Museum — frontend

Bilingual (English / Arabic) public website and visitor portal. This repo is the **Next.js frontend only**; it consumes the .NET (ASP.NET Core) REST API.

- Stack: Next.js 16 (App Router) · React 19 · TypeScript · Tailwind CSS v4 · next-intl · Zod · MSW · pnpm
- Acceptance bar: WCAG 2.2 AA + Mada certification, Core Web Vitals targets, SEO parity with the old site

**Rules for this repo — for people and Claude Code alike — are in [`CLAUDE.md`](CLAUDE.md).** The reasoning behind them is in [`docs/PROJECT-SETUP.md`](docs/PROJECT-SETUP.md); known framework issues in [`docs/known-issues.md`](docs/known-issues.md).

## First run

Requires Node 22+ and pnpm 12.

```bash
pnpm install
cp .env.example .env.local
pnpm gen:types        # skip until the API spec URL exists
pnpm dev              # NEXT_PUBLIC_USE_MOCKS=true runs entirely on MSW
```

Open http://localhost:3000 — it redirects to `/en`; `/ar` is the right-to-left version.

## Everyday commands

| Command | What it does |
|---|---|
| `pnpm dev` | Dev server |
| `pnpm lint` · `pnpm typecheck` · `pnpm test` | ESLint (project rules included), TypeScript, Vitest |
| `pnpm test:e2e` | Playwright on a production build: every locale, axe, html-validate, security headers |
| `pnpm storybook` | `components/ui` primitives, with an RTL toggle and the a11y panel |
| `pnpm token:clamp <minPx> <maxPx> <minVw> <maxVw> --name=--token` | Fluid `clamp()` token for `styles/tokens.css` |
| `pnpm gen:types` | Regenerate API types from the backend's OpenAPI spec (URL still to be set) |
| `pnpm audit` · `pnpm secrets` | Production dependency audit, secret scan |

Branch per page/feature off `development`; the PR checklist is in `.azuredevops/pull_request_template.md`.

---

Created from nextjs-starter on 2026-10-11 — check the template's `CHANGELOG.md` for improvements made since.
