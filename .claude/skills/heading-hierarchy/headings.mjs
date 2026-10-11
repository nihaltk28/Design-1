// Automated half of the heading-hierarchy skill.
//   Page mode:   node .claude/skills/heading-hierarchy/headings.mjs <url> [<url> …]
//                → the heading outline of the server-rendered HTML and its problems
//   Source mode: node .claude/skills/heading-hierarchy/headings.mjs --src
//                → hardcoded heading levels in components/ui and components/sections
//                  (reusable blocks must take their level from the page, not fix it themselves)
import { readdirSync, readFileSync, existsSync } from "node:fs";
import path from "node:path";
import { JSDOM } from "jsdom";

const args = process.argv.slice(2);

if (args.includes("--src")) {
  const roots = ["components/ui", "components/sections"].filter((d) => existsSync(d));
  const files = (dir) =>
    readdirSync(dir, { withFileTypes: true }).flatMap((e) => {
      const full = path.join(dir, e.name);
      return e.isDirectory() ? files(full) : /\.tsx$/.test(e.name) && !/\.(stories|test)\.tsx$/.test(e.name) ? [full] : [];
    });
  const findings = [];
  for (const file of roots.flatMap(files)) {
    readFileSync(file, "utf8").split("\n").forEach((line, i) => {
      for (const m of line.matchAll(/<h([1-6])[\s>]/g)) {
        findings.push({
          file: `${file}:${i + 1}`,
          level: Number(m[1]),
          problem: m[1] === "1" ? "h1 inside a reusable block — only the page template owns the h1" : "hardcoded level — take it from a prop (e.g. `as` / `level`)",
        });
      }
    });
  }
  console.log(JSON.stringify({ mode: "source", scanned: roots, findings }, null, 2));
  process.exit(0);
}

const urls = args.filter((a) => !a.startsWith("--"));
if (urls.length === 0) {
  console.error("Usage: node .claude/skills/heading-hierarchy/headings.mjs <url> [<url> …] | --src");
  process.exit(2);
}

const pages = [];
for (const url of urls) {
  const res = await fetch(url);
  const doc = new JSDOM(await res.text()).window.document;
  const headings = [...doc.querySelectorAll("h1,h2,h3,h4,h5,h6,[role=heading]")].map((h) => {
    const level = h.getAttribute("role") === "heading" ? Number(h.getAttribute("aria-level") ?? 2) : Number(h.tagName[1]);
    const text = (h.textContent ?? "").replace(/\s+/g, " ").trim();
    const hidden = h.closest("[hidden],[aria-hidden=true]") !== null;
    return { level, text: text.slice(0, 70), empty: text === "", hidden };
  });
  const problems = [];
  const h1s = headings.filter((h) => h.level === 1);
  if (h1s.length === 0) problems.push("no h1");
  if (h1s.length > 1) problems.push(`${h1s.length} h1s: ${h1s.map((h) => `"${h.text}"`).join(", ")}`);
  if (headings[0] && headings[0].level !== 1) problems.push(`first heading is h${headings[0].level}, not h1 ("${headings[0].text}")`);
  headings.forEach((h, i) => {
    const prev = i === 0 ? 0 : headings[i - 1].level;
    if (i > 0 && h.level > prev + 1) problems.push(`skipped level: h${prev || "-"} → h${h.level} ("${h.text}")`);
    if (h.empty) problems.push(`empty h${h.level}`);
    if (h.hidden) problems.push(`hidden h${h.level} ("${h.text}") — invisible to screen readers too`);
  });
  const outline = headings.map((h) => `${"  ".repeat(h.level - 1)}h${h.level} ${h.text || "(empty)"}`);
  pages.push({ url, status: res.status, count: headings.length, outline, problems });
}
console.log(JSON.stringify({ mode: "pages", pages }, null, 2));
