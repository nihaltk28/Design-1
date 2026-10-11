---
name: a11y-audit
description: Page-by-page accessibility audit for this project — WCAG 2.2 AA (and Mada for Qatar government work). Runs the automated half with the bundled script (heading and landmark structure, skip link, axe-core scan, list markup, a keyboard focus walk) in every locale at phone and desktop width, then the manual keyboard checks, then triages each finding with a fixed policy (fix code bugs inline, never change design tokens, ask before building missing features) and reports in a fixed format. Use whenever the user asks to test, audit, review or check a page, route, component or URL for accessibility, a11y, WCAG, Mada, keyboard or screen-reader support, asks whether a page is accessible, or says "continue the audit" / "do the same on this page" — even if the word "accessibility" isn't used. For a whole-site or Mada certification readiness check, use mada-audit, which runs this on every page.
---

# Accessibility audit (WCAG 2.2 AA · Mada)

The point is **consistency**: every page is checked the same way, so the next audit catches the same classes of bug the last one did. Rules being checked: `CLAUDE.md` §4. An automated-clean result is **not** sign-off and **not** Mada certification — say so in every report.

## Before you start

1. **Test a production build, not `next dev`.** Dev has a known empty-section bug (`docs/known-issues.md` #2) that looks like an a11y failure. Build and start on a spare port:
   ```bash
   NEXT_PUBLIC_USE_MOCKS=true pnpm build && pnpm start --port 3300
   ```
   Check it answers before testing (`curl -s -o /dev/null -w "%{http_code}" http://localhost:3300/en`). Port 3000 is often another project's dev server — never assume what's on it. Stop the server you started when you're done.
2. **Know the nav breakpoint.** Read `--breakpoint-nav` (or similar) in `styles/tokens.css`. Below it the desktop nav is *correctly* hidden behind a menu button — test desktop width above it, or a hidden nav will look like a keyboard bug.
3. **One key press at a time** for anything you'll report. Batched presses can drop keys and fake a "focus lost" bug. Verify each press before the next.

## 1. Automated checks — every locale × 320 px and desktop

```bash
node .claude/skills/a11y-audit/audit.mjs http://localhost:3300/en/<route> --width=320
node .claude/skills/a11y-audit/audit.mjs http://localhost:3300/en/<route> --width=1440
node .claude/skills/a11y-audit/audit.mjs http://localhost:3300/ar/<route> --width=320
node .claude/skills/a11y-audit/audit.mjs http://localhost:3300/ar/<route> --width=1440
```

Read the JSON. Each of these is a finding:

| Field | Problem when |
|---|---|
| `status` | not 200 |
| `structure.lang` / `dir` | not the route's locale / not `rtl` for Arabic |
| `structure.title` | empty, or identical across different pages |
| `structure.h1Count` | not exactly 1 |
| `structure.skippedHeadingLevels` | not empty |
| `structure.landmarks` | no `header` / `main` / `footer`; `unlabelledNavs` > 0 when there's more than one nav; any `duplicateNavNames` |
| `structure.skipLink` | `isSkipLink`, `targetExists` or `targetFocusable` false — a skip link whose target isn't focusable (`<main id="main" tabIndex={-1}>`) scrolls but leaves focus behind |
| `structure.listMarkupSuspects` | repeated cards / links in a `<div>` instead of `<ul>`/`<ol>` — confirm in the source before reporting |
| `axe.violations` | any. Read `samples[].summary` before deciding the cause — for `color-contrast` it gives the actual colours, which tell you which token is responsible |
| `keyboard.focusLostToBody` | > 0 between real stops (focus fell out of the page) |
| `keyboard.withoutVisibleFocus` | not empty — each must use the `focus-ring` utility |
| `keyboard.offScreenFocus` | not empty — focus on something invisible (hidden menu item still tabbable) |
| `keyboard.withoutAccessibleName` | not empty — icon buttons / links need `aria-label` |
| `keyboard.order` | doesn't follow the visual reading order (and, in Arabic, the right-to-left order) |

`withoutVisibleFocus` is a heuristic (it checks for an outline or box-shadow). Confirm a hit in the browser before reporting it.

## 2. Manual keyboard checks — the page's own interactions

For every interactive pattern on the page (menu, dropdown, accordion, tabs, dialog, carousel, form), in English and Arabic:

- **Hover = focus.** Anything that opens on hover must open on focus or Enter/Space too (`CLAUDE.md` §4, §7 Interactive states).
- **ARIA matches the pattern:** `aria-expanded` on disclosure triggers, `role="tab"` + `aria-selected` for tabs, `aria-modal` + focus trap for dialogs.
- **Escape closes and returns focus to the trigger** — and it *stays* closed. Test **open → Tab further in → Escape**, not only open → Escape: a trigger that opens on focus can re-open itself when focus returns to it.
- **Arrow keys** move within tabs, menus and radio groups; **Tab** leaves the group.
- **No keyboard trap:** Tab and Shift+Tab always get out (except an open modal, which must trap until closed).
- **Forms:** every field has a `<label>`; errors use `aria-describedby` + `aria-invalid`; submit with errors shows an error summary and moves focus to it; never colour alone.
- **Route change:** after client navigation, focus moves to the `<h1>`/`<main>` and the change is announced.

## 3. What you can't check — say so, don't imply it

- **Screen reader** (VoiceOver / NVDA), in English **and Arabic** — needs a person.
- **Visual RTL mirroring** (icon direction, layout flip) — the script only confirms `dir`/`lang`.
- **200% zoom and text resize**, **reduced motion** visually, **real-device** touch targets.
- **Mada certification** — only an accredited audit gives it.

List these under 🟡 in the report every time, so nobody mistakes an automated pass for sign-off.

## 4. Triage — every finding goes in exactly one bucket

- **Code bug** (missing label, `<div onClick>`, list in a `<div>`, non-focusable skip target, hover-only interaction, missing `aria-expanded`, no visible focus) → **fix it now**, in the shared primitive if it comes from one — the same bug is usually on every page using it. Then re-run whichever step found it; a green build alone doesn't prove the fix. Run `pnpm lint`, `pnpm typecheck`, `pnpm test`. Don't commit — ask (`CLAUDE.md` §3).
  - Converting a `<div>` to `<ul>`/`<li>`: move any `col-span-*` / `row-span-*` from the old child onto the `<li>`, or a grid layout silently breaks. If you can't see the result, say so.
- **Design-token issue** (a colour pair failing contrast) → **never change the token**. That needs the designer. Record it in `docs/a11y-findings.md` (create it if missing): token, colours, ratio found, where seen, date. If it's already listed, note "already known" and move on. Tell the user to raise it with the designer.
- **Missing feature** (no per-page `<title>`, no search label because search isn't built, no announcer) → **flag it and ask.** Don't build features during an audit.

## Report format

```
## <route> — accessibility audit (<date>)
Checked: en + ar · 320 px + 1440 px · production build

✅ <passed>
🔧 <fixed: what, file:line, re-tested by …>
⏸ <design-token issue recorded in docs/a11y-findings.md — needs designer>
🟡 <needs a decision, or couldn't be verified: screen reader (en + ar), visual RTL, zoom — always listed>

Automated checks catch roughly a third of accessibility issues. This is not WCAG sign-off or Mada certification.
```

Short — what changed and what's left, not a transcript.
