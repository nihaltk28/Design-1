# Next.js team starter

The team's standard setup for new frontend projects: **Next.js (App Router) consuming any backend API** (.NET, Laravel, WordPress, Drupal…). It gives every project the same rules, folder structure, rendering approach and quality gates, and makes Claude Code follow them automatically.

## What's in here

| File | Purpose |
|---|---|
| `CLAUDE.md` | The project rulebook. Claude Code reads it every session. Starts as a template with `{{placeholders}}` |
| `docs/ARCHITECTURE.md` | One-page overview for the team and leads: architecture diagram, how to start a project, open decisions |
| `docs/PROJECT-SETUP.md` | The why behind the rules: stack, rendering & caching, backend integration, a11y, SEO, performance, security |
| `docs/known-issues.md` | Incident log. Starts with two stack-level issues carried over from earlier projects |
| `eslint.project-rules.mjs` | Key rules enforced by ESLint (no mock imports, no `fetch` in components, no CDN libraries, `next/image` only, logical RTL classes, no raw hex/px, no hardcoded text, strict `jsx-a11y`, `server-only` in `lib/api`/`lib/auth`…) |
| `lib/i18n/messages.test.ts` | Vitest: every locale has every translation key, none empty |
| `styles/contrast.test.ts` | Vitest: every colour pair the design uses meets 4.5:1 / 3:1 |
| `scripts/clamp.mjs` | `pnpm token:clamp 14 18 1400 1920` → a ready-to-paste fluid `clamp()` token |
| `azure-pipelines.pr.yml` | PR gate: lint, typecheck, Vitest, `pnpm audit`, Playwright + axe. Make it a required branch-policy build per project |
| `.azuredevops/pull_request_template.md` | PR checklist — the manual checks CI can't do |
| `.husky/pre-commit` + `lint-staged.config.mjs` | Pre-commit: ESLint fix + Prettier on staged files, translation and contrast checks when those files change |
| `tests/e2e/layout.spec.ts` | Playwright: every locale × 320/768/1280/1536/1920 (phone, tablet, laptop at 150% / 125% scaling, desktop) — no horizontal overflow, no axe violations, opt-in visual snapshots |
| `tests/e2e/markup.spec.ts` | Playwright: every template's server HTML passes `html-validate` in every locale (page list shared in `tests/e2e/pages.ts`) |
| `.husky/commit-msg` + `.secretlintrc.json` | Git hooks: reject AI attribution in commit messages; block committed secrets |
| `tests/unit/stories.test.ts` + `.storybook/` | Every `components/ui` primitive must have a story; Storybook has an LTR / RTL toolbar switch and runs axe on every story |
| `lib/security/` + `app/api/revalidate/route.ts` | Constant-time secret check, rate limiter, and a hardened CMS webhook — tested by `tests/unit/security.test.ts` and `revalidate.test.ts` |
| `CHANGELOG.md` | What changed in the template, so existing projects can pick up improvements |
| `lib/api/client.ts` + `errors.ts`, `lib/mocks/server.ts` | The API client (`getPublic` / `getPrivate`, timeouts, Zod, typed errors) — starts MSW itself when mocks are on, including during `next build` |
| `playwright.config.ts`, `vitest.config.mts`, `next.config.ts`, `.storybook/`, `.prettierrc.json`, `.env.example` | Tested configs: e2e on a prod build with mocks (port 3100), unit tests, Next config (`agentRules: false` keeps Next out of `CLAUDE.md`), Storybook, Tailwind class sorting |
| `.claude/settings.json` + `.claude/hooks/lint-changed.sh` | After every file Claude edits, ESLint runs on it; failures go back to Claude to fix |
| `.claude/skills/` | Six Claude Code skills — accessibility, Mada readiness, W3C markup, SEO, headings, WebP (see **Skills** below) |
| `.claude/commands/scaffold.md` | The `/scaffold` command that turns this template into a real project |

## Starting a new project

**Needs:**
- Node 24 LTS (`nvm install 24 && nvm alias default 24`)
- pnpm 12 (`npm install -g pnpm@12` — re-run after switching Node versions; the PR pipeline uses the same major)
- Claude Code — desktop app, terminal or VS Code extension. Terminal: check `claude --version` works (see Troubleshooting if not)
- Access to this repo (it's private — ask the owner to add you), and your SSH key added to GitHub

**Folder and repo names:** lowercase with hyphens, no spaces — `unified-education-record`, not `Unified Education Record`.

### 1. Create the project from the template

Pick one:

- **GitHub:** on this repo click **Use this template → Create a new repository**, then clone your new repo.
- **Azure DevOps** (where most projects live): **Repos → Import repository**, paste this repo's GitHub URL, sign in with a GitHub personal access token when asked, then clone from Azure.
- **Local copy without history** (then push it wherever the project lives) — use SSH, because plain `npx degit owner/repo` can't see a private repo:
  ```bash
  npx degit git@github.com:manikantanapplab/nextjs-starter my-project --mode=git
  cd my-project
  git init
  ```
  Copying by hand instead? Include the hidden folders — `cp -R nextjs-starter/. my-project/`.

### 2. Run `/scaffold` — in a fresh Claude Code session, inside the project folder

`/scaffold` lives in the project's `.claude/commands/`, so Claude only finds it when the session **starts in the project folder**.

- **Desktop app:** start a new Code session and choose the project folder.
- **Terminal:**
  ```bash
  cd my-project
  claude
  ```

Then type `/scaffold`. Use a **fresh** session — one that has seen another project may reuse its answers (`/clear` first if needed).

Claude asks 15 questions — name, backend and owner, spec URL, audience, login, languages, Mada, redirects, rich text, webhooks, monitoring, forms, design source (Figma, existing HTML, or "other: screenshots only") — shows a plan, and after you approve it creates the app, installs everything and runs every check. Approve the project's lint hook if Claude Code asks. It **won't commit** without asking you.

### 3. After scaffolding

1. **Commit** (Claude asks first), then push to the project's repo.
2. **Azure DevOps, once per project** (needs portal access): register `azure-pipelines.pr.yml` and make it a **required Build validation** on `main` — steps at the top of the file. Until then PR checks don't block merges.
3. **Fill the plan:** real routes in the `CLAUDE.md` §2 route table and `docs/PROJECT-SETUP.md` §16 page inventory; real design tokens in `styles/tokens.css`; the API spec URL in `gen:types` once the backend has one.
4. Start building — ask Claude in plain language, e.g. *"Build the home page from `docs/design/home.png`"*.

### Troubleshooting

| Problem | Cause | Fix |
|---|---|---|
| `npx degit …` → `could not fetch https://github.com/…` / `could not find commit hash for HEAD` | The repo is private; plain degit downloads without signing in | Use the SSH form above (`git@github.com:… --mode=git`), or *Use this template* |
| Project folder ends up named `Unified` | Spaces in the name split it into separate arguments | Use a hyphenated name: `unified-education-record` |
| `/scaffold` → "no /scaffold command in this session" | Claude was started outside the project folder (e.g. your home folder) | Start a new session **in the project folder** |
| `zsh: command not found: claude` | Claude Code's folder `~/.local/bin` isn't on your PATH | Run `~/.local/bin/claude` once, or fix permanently: `echo 'export PATH="$HOME/.local/bin:$PATH"' >> ~/.zshrc && source ~/.zshrc` — or use the desktop app |
| `/scaffold` says the folder "isn't a fresh template" | It was already scaffolded, or has `package.json` / `node_modules` from elsewhere | Start again from a clean copy of the template |
| Install stops with `ERR_PNPM_IGNORED_BUILDS` | pnpm blocks dependency build scripts | `/scaffold` handles it; manually, set each listed package to `false` under `allowBuilds` in `pnpm-workspace.yaml` and re-run |
| `claude` asks to approve a hook | The project's lint-on-edit hook (`.claude/settings.json`) | Approve it — it's what makes Claude fix lint errors as it writes |

## Skills

| Skill | Ask Claude, for example | What it does |
|---|---|---|
| `a11y-audit` | *"Check /news for accessibility"* | One page, every locale, 320 px + desktop: structure, skip link, axe (WCAG 2.2 AA), list markup, keyboard focus walk, manual keyboard checks; fixes code bugs, records token issues for the designer |
| `mada-audit` | *"Are we ready for the Mada audit?"* | Every page in the sitemap through `a11y-audit`, plus site-level items: accessibility statement in each language, language switch, captions, iframe titles, documents to check; writes `docs/mada-readiness.md`. A readiness check — not certification |
| `w3c-validate` | *"Validate the HTML of the home page"* | W3C markup validity with html-validate, locally (same rules as CI); finds whether the cause is a component or CMS rich text and fixes it there |
| `seo-audit` | *"Check SEO on these pages"* | Title, description, canonical, hreflang + x-default, Open Graph / Twitter, JSON-LD, robots, sitemap, duplicates — fixed through `generateMetadata` and `lib/seo` |
| `heading-hierarchy` | *"Fix the heading order"* | Page outline per locale (one h1, no skipped levels, no empty headings) and a scan for hardcoded levels in reusable components |
| `images-webp` | *"Convert the images to WebP"* | Dry run, then converts PNG/JPEG in `public/assets`, updates code references, checks pages; deletes originals only with your OK. Skips SVG, GIF, icons and social-share images |

Each skill has a script next to its `SKILL.md`, so the automated part runs the same way every time. Claude picks the skill by itself from what you ask — no command to remember. All of them run against a production build (`NEXT_PUBLIC_USE_MOCKS=true pnpm build && pnpm start --port 3300`) and never commit without asking.

## Working in a project

- Just give Claude Code tasks — it follows `CLAUDE.md` and fixes its own lint errors.
- New page → add its row to the §2 route table first; that decides how it renders and caches.
- Found the cause of a bug → entry in `docs/known-issues.md`, one-line rule in `CLAUDE.md` §9.
- Decision made → move it from §10 Open decisions into the rules. TODO done → tick it in §11.
- Keep `CLAUDE.md` for rules only; stories and explanations go in `docs/`.

## Maintaining the template

Improvements that apply to every project (a new lint rule, a better convention, a new stack-level known issue) go into **this template repo**, not only into the project where they were found — so the next project starts with them.
