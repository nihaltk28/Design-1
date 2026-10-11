## What & why

<!-- One or two lines. Link the ticket. -->

## Screenshots

<!-- Changed UI: EN + AR, mobile (320px) and desktop. -->

## Checks

CI runs lint, typecheck, unit tests, `pnpm audit` and e2e (overflow + axe at 320/768/1280/1536/1920, HTML validation, security headers — every locale). The pre-commit hook already ran secretlint. The rest is on you — see "What's automated and what isn't" in `docs/ARCHITECTURE.md`. Tick what applies, and strike through (`~~item~~`) what doesn't.

**Every PR**
- [ ] Checked in every locale at 320px, tablet and desktop, including RTL
- [ ] Keyboard pass (Tab / Shift+Tab / Enter / Esc) on everything this touches; visible focus throughout
- [ ] Empty, loading and error states exist, not just the happy path
- [ ] No new raw hex / px / width values outside `styles/tokens.css`

**New or changed page**
- [ ] Row in the `CLAUDE.md` §2 route table exists, and data calls use `getPublic` / `getPrivate` to match it
- [ ] Template added to `PAGES` in `tests/e2e/pages.ts` (layout, axe and HTML validation then cover it)
- [ ] One `<h1>`, no skipped heading levels; metadata, canonical, hreflang and JSON-LD correct
- [ ] LCP image has `priority`; every image / embed has reserved space; no new external domains in the Network tab
- [ ] Old URL redirects here (if replacing a site)

**New interactive pattern (first instance)**
- [ ] Full keyboard and screen-reader check (VoiceOver / NVDA), in Arabic too
- [ ] ARIA pattern decided (`aria-expanded`, `role="tab"`…) and a Vitest keyboard test added

**Forms / anything that writes**
- [ ] Server-side Zod validation and a session / permission check inside the action or handler
- [ ] A test calls it logged out and with invalid input and expects a refusal (`CLAUDE.md` §6)
- [ ] Manually checked: another user's ID in the URL / form is refused; redirects stay on our site; uploads reject wrong types and sizes

**Speed-related change**
- [ ] Lighthouse mobile (throttled), before → after:

  | | LCP | INP / TBT | CLS | Score |
  |---|---|---|---|---|
  | Before | | | | |
  | After | | | | |

**Translations**
- [ ] New strings reviewed by that language's reviewer (or ticket raised)
