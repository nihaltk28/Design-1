---
name: heading-hierarchy
description: Heading structure check and fix for this project — prints the h1–h6 outline of each page in every locale, finds missing or duplicate h1s, skipped levels, empty or hidden headings, and headings that don't match the visual structure, and scans components/ui and components/sections for hardcoded heading levels that break the outline when a block is reused. Use when the user asks about headings, heading order or levels, h1/h2/h3, the page outline or document structure, or when a11y-audit or seo-audit reports a heading problem.
---

# Heading hierarchy

Headings are how screen-reader users navigate and how search engines read structure. Rule (`CLAUDE.md` §4): **one `<h1>` per page, no skipped levels, levels follow the content outline — not the font size.**

## 1. Check pages

Production build on a spare port, then every locale:

```bash
node .claude/skills/heading-hierarchy/headings.mjs http://localhost:3300/en/<route> http://localhost:3300/ar/<route>
```

Read the `outline` — it should read like a table of contents for the page. Problems listed: no h1, several h1s, first heading not h1, skipped levels, empty headings, hidden headings.

## 2. Check components

```bash
node .claude/skills/heading-hierarchy/headings.mjs --src
```

Reusable blocks in `components/ui` and `components/sections` must **not** fix their own level: the same card is an `h2` on one page and an `h3` on another. Only the **page template** (`components/templates`) owns the `h1`.

Pattern for a reusable block:

```tsx
type HeadingLevel = 2 | 3 | 4 | 5 | 6;
export function Card({ title, headingLevel = 2 }: { title: string; headingLevel?: HeadingLevel }) {
  const Heading = `h${headingLevel}` as const;
  return <Heading className="text-[length:var(--text-card-title)]">{title}</Heading>;
}
```

The template passes the right level for where the block sits. Visual size comes from tokens, never from picking a different heading level.

## 3. Fix rules

- **Several h1s** → keep the page title as h1; demote the rest. Logos and site names in the header are not headings.
- **Skipped level** → change the level to fit the outline, then restyle with tokens if it should *look* bigger or smaller.
- **Text styled to look like a heading but isn't one** (`<p className="text-2xl font-bold">`) → make it a real heading at the right level, if it starts a section.
- **Heading used only for styling** (a "Read more" in an `h4`) → make it a `<p>`/`<span>`.
- **Empty heading** → remove it, or give it text (often a missing translation key).
- **Section with no visible heading** (e.g. a carousel) → add one; if the design truly has none, a visually hidden heading (`sr-only`) is acceptable.
- Arabic: the outline must match English — same levels, same sections.

Re-run both commands after fixing, then `pnpm lint` and `pnpm test`. Don't commit without asking.

## Report

```
## Headings — <route> (<date>)
Outline (en): h1 … / h2 … / h3 …
✅ / 🔧 Fixed: <what, file:line> / 🟡 <needs a design decision, e.g. section with no visible heading>
```
