---
name: w3c-validate
description: W3C web-standards (HTML markup validity) check for this project — validates the server-rendered HTML of pages in every locale with html-validate and the project's .htmlvalidate.json, the same rules as the CI test, locally (pages are never sent to an outside validator). Finds invalid nesting, duplicate IDs, unclosed or misplaced tags, invalid attributes, and invalid markup coming from CMS rich text, then fixes the cause. Use when the user asks for W3C validation, HTML validation, valid markup, web standards compliance, "is this valid HTML", or when markup.spec.ts fails.
---

# W3C markup validation

Invalid HTML passes axe silently but breaks screen readers and browsers in unpredictable ways. Rules live in `.htmlvalidate.json` (the `html-validate:standard` preset, minus the rules Next.js's own output can't meet). `tests/e2e/markup.spec.ts` runs the same rules in CI for every page in `tests/e2e/pages.ts`.

## 1. Run

Production build on a spare port (`NEXT_PUBLIC_USE_MOCKS=true pnpm build && pnpm start --port 3300`), then:

```bash
node .claude/skills/w3c-validate/validate.mjs http://localhost:3300/en/<route> http://localhost:3300/ar/<route>
```

Check **every locale** — Arabic content can have its own markup problems. For a CMS page, also test with **real CMS content** (staging), not only the mock fixture: rich text is the most common source of invalid markup.

## 2. Find the cause for each rule

Use `selector` and `at` (line:column) from the output, then decide where the markup comes from:

| Source | Fix |
|---|---|
| Our component / template | Fix the JSX. Common ones: `<div>` inside `<p>`, `<a>` inside `<a>` or `<button>`, list items outside `<ul>`, duplicate `id` from a component rendered twice (use `useId()`), `<button>` without `type` |
| CMS rich text | Fix it in the `lib/content` rehype pipeline (allowlist, rewrite or unwrap the bad element) — never patch the HTML string, never `dangerouslySetInnerHTML` (`CLAUDE.md` §3). Add a test case for that markup in the pipeline's tests |
| Next.js / a library's own output | Only if a rule can't be met by any page: turn that rule off in `.htmlvalidate.json` with a comment saying why. Never to silence our own bug |

## 3. Re-check

Re-run the script on the same URLs, then `pnpm test:e2e markup` so CI agrees. If the page isn't in `tests/e2e/pages.ts`, add it.

## Report

```
## W3C markup — <route> (<date>)
✅ Valid: <urls>
🔧 Fixed: <rule> — <file:line> (cause: component | CMS rich text)
🟡 Needs a decision: <e.g. rule to disable, CMS content that needs an editor fix>
```

Note: this checks HTML. It doesn't check CSS validity or accessibility — use a11y-audit for that.
