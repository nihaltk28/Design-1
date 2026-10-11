// Site-wide sweep for the mada-audit skill. Takes the page list from /sitemap.xml (or URLs given on
// the command line), runs the a11y-audit script on every page at 320 px and 1440 px, and adds the
// site-level checks that a single-page audit doesn't cover.
//
//   node .claude/skills/mada-audit/sweep.mjs http://localhost:3300 --statement=/accessibility
//   node .claude/skills/mada-audit/sweep.mjs http://localhost:3300/en http://localhost:3300/ar/news
//
// Prints JSON: a per-page summary (counts per check), site-level findings, and the documents and media
// a person must check by hand. Full per-page details: run a11y-audit/audit.mjs on that URL.
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { JSDOM } from "jsdom";

const run = promisify(execFile);
const here = path.dirname(fileURLToPath(import.meta.url));
const AUDIT = path.join(here, "..", "a11y-audit", "audit.mjs");

const args = process.argv.slice(2);
const statement = args.find((a) => a.startsWith("--statement="))?.split("=")[1] ?? "/accessibility";
const targets = args.filter((a) => !a.startsWith("--"));
if (targets.length === 0) {
  console.error("Usage: node .claude/skills/mada-audit/sweep.mjs <origin | url …> [--statement=/accessibility]");
  process.exit(2);
}

// Page list: explicit URLs, or every <loc> in the sitemap of a bare origin.
let urls = targets;
if (targets.length === 1 && new URL(targets[0]).pathname === "/") {
  const origin = new URL(targets[0]).origin;
  const xml = await fetch(`${origin}/sitemap.xml`).then((r) => (r.ok ? r.text() : ""));
  // Sitemaps hold the production domain; test the same paths on the server being audited.
  urls = [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => origin + new URL(m[1].trim()).pathname);
  if (urls.length === 0) {
    console.error(`No URLs in ${origin}/sitemap.xml — pass the page URLs explicitly.`);
    process.exit(2);
  }
}
const origin = new URL(urls[0]).origin;

const pages = [];
const documents = new Set();
const media = [];
for (const url of urls) {
  const summary = { url };
  for (const width of [320, 1440]) {
    try {
      const { stdout } = await run("node", [AUDIT, url, `--width=${width}`, "--tabs=60"], { maxBuffer: 20 * 1024 * 1024 });
      const r = JSON.parse(stdout);
      const s = r.structure;
      summary[`w${width}`] = {
        status: r.status,
        axe: r.axe.violations.map((v) => `${v.id}×${v.nodes}`),
        h1Count: s.h1Count,
        skippedHeadings: s.skippedHeadingLevels.length,
        unlabelledNavs: s.landmarks.unlabelledNavs,
        skipLinkWorks: s.skipLink.isSkipLink && s.skipLink.targetExists && s.skipLink.targetFocusable,
        listSuspects: s.listMarkupSuspects.length,
        focusLost: r.keyboard.focusLostToBody,
        noVisibleFocus: r.keyboard.withoutVisibleFocus.length,
        noName: r.keyboard.withoutAccessibleName.length,
      };
    } catch (e) {
      summary[`w${width}`] = { error: String(e.message).slice(0, 200) };
    }
  }

  // Documents and media on the page — each needs a manual accessibility check.
  const doc = new JSDOM(await fetch(url).then((r) => r.text()), { url }).window.document;
  doc.querySelectorAll("a[href]").forEach((a) => {
    const href = a.getAttribute("href") ?? "";
    if (/\.(pdf|docx?|xlsx?|pptx?)(\?|$)/i.test(href)) documents.add(new URL(href, url).href);
  });
  doc.querySelectorAll("video, audio").forEach((m) => {
    media.push({ url, element: m.tagName.toLowerCase(), hasCaptions: !!m.querySelector('track[kind="captions"], track[kind="subtitles"]') });
  });
  doc.querySelectorAll("iframe").forEach((f) => {
    media.push({ url, element: "iframe", src: f.getAttribute("src"), hasTitle: !!f.getAttribute("title") });
  });
  summary.languageSwitch = !!doc.querySelector("a[hreflang], a[lang]");
  pages.push(summary);
}

// Site-level: an accessibility statement in every locale.
const locales = [...new Set(urls.map((u) => new URL(u).pathname.split("/")[1]).filter((seg) => /^[a-z]{2}$/.test(seg)))];
const statementPages = await Promise.all(
  (locales.length ? locales : [""]).map(async (loc) => {
    const u = `${origin}${loc ? `/${loc}` : ""}${statement}`;
    const status = await fetch(u, { redirect: "manual" }).then((r) => r.status).catch(() => 0);
    return { url: u, status };
  }),
);

const site = [];
statementPages.filter((p) => p.status !== 200).forEach((p) => site.push(`accessibility statement missing: ${p.url} → ${p.status}`));
const noSwitch = pages.filter((p) => !p.languageSwitch).map((p) => p.url);
if (locales.length > 1 && noSwitch.length) site.push(`no language switch link (with hreflang/lang) on: ${noSwitch.join(", ")}`);
media.filter((m) => m.element !== "iframe" && !m.hasCaptions).forEach((m) => site.push(`${m.element} without captions track on ${m.url}`));
media.filter((m) => m.element === "iframe" && !m.hasTitle).forEach((m) => site.push(`iframe without title on ${m.url} (${m.src})`));

const failing = pages.filter((p) =>
  ["w320", "w1440"].some((w) => {
    const r = p[w];
    return r.error || r.status !== 200 || r.axe.length || r.h1Count !== 1 || r.skippedHeadings || r.unlabelledNavs || !r.skipLinkWorks || r.focusLost || r.noVisibleFocus || r.noName;
  }),
);

console.log(
  JSON.stringify(
    {
      pagesChecked: pages.length,
      pagesWithFindings: failing.length,
      pages,
      site,
      manualChecksNeeded: { documents: [...documents], media },
    },
    null,
    2,
  ),
);
