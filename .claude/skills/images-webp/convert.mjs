// Automated half of the images-webp skill: converts PNG / JPEG source images to WebP with sharp
// (installed with Next.js). DRY RUN by default — nothing is written without --write.
//
//   node .claude/skills/images-webp/convert.mjs                 # report for public/assets
//   node .claude/skills/images-webp/convert.mjs public/assets --quality=80 --max-width=2560 --write
//
// Never converts: SVG, GIF (may be animated), ICO, fonts, favicons / app icons, and social-share
// images (og / opengraph / twitter / apple-touch), which some platforms don't accept as WebP.
// Writes the .webp next to the original. It does NOT delete originals or edit code that references
// them — the skill does that after review. Keeps the original when WebP isn't smaller.
import { readdirSync, readFileSync, statSync, existsSync } from "node:fs";
import path from "node:path";
import sharp from "sharp";

const args = process.argv.slice(2);
const dir = args.find((a) => !a.startsWith("--")) ?? "public/assets";
const flag = (name, fallback) => Number(args.find((a) => a.startsWith(`--${name}=`))?.split("=")[1] ?? fallback);
const write = args.includes("--write");
const quality = flag("quality", 80);
const maxWidth = flag("max-width", 2560);

if (!existsSync(dir)) {
  console.error(`No such folder: ${dir}`);
  process.exit(2);
}

const SKIP = /(^|[\\/])(og|opengraph|twitter|apple-touch|favicon|icon)[^\\/]*$/i;
const files = (d) =>
  readdirSync(d, { withFileTypes: true }).flatMap((e) => {
    const full = path.join(d, e.name);
    return e.isDirectory() ? (e.name === "fonts" ? [] : files(full)) : [full];
  });

// Where each image is referenced in the code, so the skill can update those references.
const CODE_DIRS = ["app", "components", "lib", "messages", "styles"].filter((d) => existsSync(d));
const codeFiles = CODE_DIRS.flatMap(function walk(d) {
  return readdirSync(d, { withFileTypes: true }).flatMap((e) => {
    const full = path.join(d, e.name);
    return e.isDirectory() ? walk(full) : /\.(tsx?|jsx?|mdx?|json|css)$/.test(e.name) ? [full] : [];
  });
});
const referencesTo = (file) => {
  const name = path.basename(file);
  return codeFiles.filter((f) => readFileSync(f, "utf8").includes(name));
};

const rows = [];
const skipped = [];
for (const file of files(dir)) {
  const ext = path.extname(file).toLowerCase();
  if (![".png", ".jpg", ".jpeg"].includes(ext)) {
    if ([".gif", ".svg", ".ico"].includes(ext)) skipped.push({ file, reason: `${ext} not converted` });
    continue;
  }
  if (SKIP.test(file)) {
    skipped.push({ file, reason: "social-share image or icon — keep PNG/JPEG" });
    continue;
  }
  const target = file.slice(0, -ext.length) + ".webp";
  const before = statSync(file).size;
  const meta = await sharp(file).metadata();
  const buffer = await sharp(file)
    .rotate()
    .resize({ width: Math.min(meta.width ?? maxWidth, maxWidth), withoutEnlargement: true })
    .webp({ quality })
    .toBuffer();
  const smaller = buffer.length < before;
  if (write && smaller) await sharp(buffer).toFile(target);
  rows.push({
    file,
    webp: smaller ? target : null,
    width: meta.width,
    resizedTo: (meta.width ?? 0) > maxWidth ? maxWidth : null,
    beforeKB: Math.round(before / 1024),
    afterKB: Math.round(buffer.length / 1024),
    savedPct: Math.round((1 - buffer.length / before) * 100),
    action: !smaller ? "kept original (WebP not smaller)" : write ? "written" : "would write",
    referencedIn: referencesTo(file),
  });
}

const total = rows.filter((r) => r.webp).reduce((a, r) => ({ before: a.before + r.beforeKB, after: a.after + r.afterKB }), { before: 0, after: 0 });
console.log(JSON.stringify({ dir, write, quality, maxWidth, images: rows, skipped, totalKB: total }, null, 2));
