---
name: mada-audit
description: Site-wide Mada certification readiness check for Qatar government projects — sweeps every page in the sitemap with the a11y-audit script in every locale at 320 px and desktop, adds the site-level items a single page audit misses (accessibility statement in every language, language switch, captions on media, titled iframes, accessible PDFs and documents, Arabic parity), and writes a readiness report. Use when the user asks about Mada, Mada certification or readiness, a full-site or pre-launch accessibility audit, "are we ready for the Mada audit", or an accessibility check across all pages. For one page, use a11y-audit instead.
---

# Mada readiness audit (site-wide)

**Mada certification is awarded only by Mada Center, after its own audit.** This skill gets the site *ready* for that audit and finds problems early — it never certifies anything, and every report says so. Mada's assessment builds on WCAG; **confirm the exact WCAG version, level and any extra requirements in Mada's current guidelines and in the project contract** before relying on this checklist.

## 1. Prepare

- Production build on mocks or staging data, on a spare port: `NEXT_PUBLIC_USE_MOCKS=true pnpm build && pnpm start --port 3300`. Not `next dev` (`docs/known-issues.md` #2).
- The sitemap must list every public page in every locale — the sweep uses it. If it's incomplete, pass URLs explicitly, and fix the sitemap (SEO needs it too).
- Know the accessibility statement route (default `/accessibility`).

## 2. Sweep every page

```bash
node .claude/skills/mada-audit/sweep.mjs http://localhost:3300 --statement=/accessibility
```

For each page with findings, run the full page audit and follow the **a11y-audit** skill for it (manual keyboard checks, triage, fixes):

```bash
node .claude/skills/a11y-audit/audit.mjs <url> --width=320
```

Fix shared components first — one fix usually clears the same finding on many pages. Re-run the sweep after fixing.

## 3. Site-level checklist — beyond single pages

Mark each ✅ / ❌ / ❓(needs a person):

| Item | How to check |
|---|---|
| Accessibility statement in **every** language: conformance level claimed, known limitations, date, a real contact (email / phone / form) for accessibility problems | sweep `site` list; read the page |
| Language switch on every page, keyboard-reachable, with `lang`/`hreflang` on the link | sweep `languageSwitch`; Tab to it |
| **Arabic parity**: every page and feature exists in Arabic, not just the English | compare sitemap per locale; spot-check content |
| Consistent navigation and identification: header, footer, search in the same place with the same names on every page | sweep outlines; visual check |
| Video: captions (and transcripts / audio description where needed), in Arabic for Arabic content; no autoplay with sound | sweep `manualChecksNeeded.media`; watch them |
| Embedded maps, videos, forms (`<iframe>`) have a `title`, and work by keyboard | sweep `site` list; Tab through |
| **Documents** (PDF, Word, Excel) linked from the site are accessible — tagged PDFs, reading order, Arabic text real text not images — or have an accessible HTML alternative | sweep `manualChecksNeeded.documents`; open each. Document remediation is often its own workstream: flag the count early |
| Forms site-wide: labels, error messages and summary, no image captcha (`CLAUDE.md` §6) | a11y-audit on each form page |
| Timeouts (session expiry, carousels) can be paused or extended | manual |
| 200% zoom and 320 px reflow in both languages | manual |
| Screen reader pass in **Arabic and English** (NVDA + VoiceOver) on the main templates | a person |

## 4. Triage

Same policy as a11y-audit: **code bugs** → fix (shared primitive first), re-test, don't commit without asking; **design tokens** → never change, record in `docs/a11y-findings.md` for the designer; **missing features** (no statement page, no captions, inaccessible PDFs) → list them and ask — they often need content owners, not developers.

## 5. Report

Write `docs/mada-readiness.md` (overwrite each run, keep a dated history line at the top) and summarise:

```
## Mada readiness — <date>
Pages: <n> in sitemap · <n> with findings · checked en + ar at 320 px + 1440 px

❌ Blocking (fix before the Mada audit): …
🔧 Fixed this run: …
⏸ Design-token issues for the designer: …
❓ Needs a person / content owner: screen reader (en + ar), documents (<n>), media captions (<n>), …

This is a readiness check, not Mada certification. Certification is by Mada Center's own audit.
```
