---
name: images-webp
description: Convert this project's PNG and JPEG source images in public/assets to WebP with sharp — dry run first, then write, update every reference in the code, check the pages, and only then remove the originals with the user's OK. Skips SVG, GIF, icons, favicons and social-share (Open Graph / Twitter) images. Use when the user asks to convert images to WebP, optimise or compress images, reduce image size, or when large PNG/JPEG files are added to public/assets.
---

# Convert images to WebP

**What this is for — and what it isn't.** `next/image` already serves WebP / AVIF to browsers automatically (`images.formats` in `next.config.ts`), so converting doesn't change what most visitors download for `next/image` images. Converting the **source files** still helps: a smaller repo and deploys, smaller originals for anything not going through `next/image`, and a cap on oversized uploads. Images must still be rendered with `next/image` (`CLAUDE.md` §5).

**Never convert:** SVG (already vector), GIF (may be animated), `.ico` / favicons / app icons, and **social-share images** (`og*`, `opengraph*`, `twitter*`, `apple-touch*`) — some platforms don't accept WebP for previews. The script skips these.

## 1. Dry run

```bash
node .claude/skills/images-webp/convert.mjs public/assets
```

It reports each image's size before and after, the % saved, whether it would be resized (default cap 2560 px wide), and **where the code references it**. Show the user the totals. Images where WebP isn't smaller are kept as they are.

Options: `--quality=80` (default; use 85–90 for photos with fine detail or text in the image), `--max-width=2560`.

## 2. Write

```bash
node .claude/skills/images-webp/convert.mjs public/assets --write
```

Writes `name.webp` next to `name.png` / `name.jpg`. Originals stay.

## 3. Update references

For every image in the output's `referencedIn` list, change `.png` / `.jpg` / `.jpeg` to `.webp` in those files — imports, `src` strings, fixtures in `lib/mocks`, CSS `url()`. Then search again for the old names (they may also appear in Markdown docs or the CMS) so nothing points at a file that's about to go.

If an image is **not referenced anywhere**, tell the user — it may be unused and can be deleted instead.

## 4. Check

- `pnpm build` and `pnpm test:e2e` pass.
- Open the pages that use the images at 320 px and desktop: nothing broken, no visible quality loss (look at text inside images, gradients and logos most closely). Raise `--quality` and re-run for any that look worse.
- `width` / `height` / `sizes` on `next/image` still match — an image resized by the cap keeps its aspect ratio, so reserved space is unchanged.

## 5. Remove originals — ask first

Only after the checks pass, and **only with the user's OK**, delete the converted PNG / JPEG files. Don't commit without asking (`CLAUDE.md` §3).

## Report

```
## Images → WebP (<date>)
Converted <n> · <before> KB → <after> KB (−<pct>%) · kept <n> (WebP not smaller) · skipped <n> (icons / social / SVG)
References updated: <files>
🟡 Originals still present — delete? / Unreferenced images: <list>
```
