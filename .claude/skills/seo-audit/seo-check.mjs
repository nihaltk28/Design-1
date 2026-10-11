// Automated half of the seo-audit skill. Checks what a crawler sees: the server-rendered HTML (no JS),
// response headers, and — with --site — robots.txt and sitemap.xml.
//
//   node .claude/skills/seo-audit/seo-check.mjs http://localhost:3300/en http://localhost:3300/ar --site
//
// Prints JSON: per-URL facts and a `problems` list, plus cross-page duplicates.
import { JSDOM } from "jsdom";

const args = process.argv.slice(2);
const site = args.includes("--site");
const urls = args.filter((a) => !a.startsWith("--"));
if (urls.length === 0) {
  console.error("Usage: node .claude/skills/seo-audit/seo-check.mjs <url> [<url> …] [--site]");
  process.exit(2);
}

const isAbsolute = (u) => /^https?:\/\//.test(u ?? "");
const norm = (u) => {
  try {
    const x = new URL(u);
    return `${x.origin}${x.pathname.replace(/\/$/, "") || "/"}`;
  } catch {
    return u;
  }
};

const pages = [];
for (const url of urls) {
  const res = await fetch(url, { redirect: "manual" });
  const problems = [];
  if (res.status !== 200) {
    pages.push({ url, status: res.status, problems: [`status ${res.status} (redirect target: ${res.headers.get("location") ?? "—"})`] });
    continue;
  }
  const doc = new JSDOM(await res.text()).window.document;
  const meta = (sel) => doc.querySelector(sel)?.getAttribute("content")?.trim() ?? null;

  const title = doc.title.trim();
  const description = meta('meta[name="description"]');
  const canonical = doc.querySelector('link[rel="canonical"]')?.getAttribute("href") ?? null;
  const robots = [meta('meta[name="robots"]'), res.headers.get("x-robots-tag")].filter(Boolean).join(", ") || null;
  const alternates = [...doc.querySelectorAll('link[rel="alternate"][hreflang]')].map((l) => ({
    hreflang: l.getAttribute("hreflang"),
    href: l.getAttribute("href"),
  }));
  const og = {
    title: meta('meta[property="og:title"]'),
    description: meta('meta[property="og:description"]'),
    image: meta('meta[property="og:image"]'),
    url: meta('meta[property="og:url"]'),
    type: meta('meta[property="og:type"]'),
  };
  const twitterCard = meta('meta[name="twitter:card"]');
  const jsonLd = [...doc.querySelectorAll('script[type="application/ld+json"]')].map((s) => {
    try {
      const data = JSON.parse(s.textContent ?? "");
      const items = Array.isArray(data) ? data : data["@graph"] ?? [data];
      return { valid: true, context: data["@context"] ?? null, types: items.map((i) => i["@type"]).flat() };
    } catch (e) {
      return { valid: false, error: String(e.message).slice(0, 80) };
    }
  });
  const h1Count = doc.querySelectorAll("h1").length;
  const imagesWithoutAlt = [...doc.querySelectorAll("img")].filter((i) => !i.hasAttribute("alt")).length;
  const lang = doc.documentElement.getAttribute("lang");

  if (!lang) problems.push("<html> has no lang");
  if (!title) problems.push("no <title>");
  else if (title.length < 15 || title.length > 60) problems.push(`title length ${title.length} (aim 15–60)`);
  if (!description) problems.push("no meta description");
  else if (description.length < 50 || description.length > 160) problems.push(`description length ${description.length} (aim 50–160)`);
  if (!canonical) problems.push("no canonical");
  else if (!isAbsolute(canonical)) problems.push(`canonical not absolute: ${canonical}`);
  else if (norm(canonical) !== norm(url)) problems.push(`canonical points elsewhere: ${canonical}`);
  if (robots && /noindex/i.test(robots)) problems.push(`noindex (${robots}) — correct on staging, wrong on production`);
  if (alternates.length === 0) problems.push("no hreflang alternates");
  else {
    if (!alternates.some((a) => a.hreflang === "x-default")) problems.push("no hreflang x-default");
    const rel = alternates.filter((a) => !isAbsolute(a.href)).map((a) => a.hreflang);
    if (rel.length) problems.push(`hreflang not absolute: ${rel.join(", ")}`);
  }
  for (const [k, v] of Object.entries({ "og:title": og.title, "og:description": og.description, "og:image": og.image, "og:url": og.url })) {
    if (!v) problems.push(`no ${k}`);
  }
  if (og.image && !isAbsolute(og.image)) problems.push(`og:image not absolute: ${og.image}`);
  if (!twitterCard) problems.push("no twitter:card");
  if (jsonLd.length === 0) problems.push("no JSON-LD structured data");
  jsonLd.filter((j) => !j.valid).forEach((j) => problems.push(`invalid JSON-LD: ${j.error}`));
  if (h1Count !== 1) problems.push(`h1 count ${h1Count} (should be 1)`);
  if (imagesWithoutAlt) problems.push(`${imagesWithoutAlt} <img> without alt`);

  pages.push({ url, status: 200, lang, title, description, canonical, robots, alternates, og, twitterCard, jsonLd, h1Count, problems });
}

const dupes = (key) => {
  const seen = {};
  pages.filter((p) => p[key]).forEach((p) => (seen[p[key]] ??= []).push(p.url));
  return Object.entries(seen).filter(([, list]) => list.length > 1).map(([value, list]) => ({ value, urls: list }));
};

let siteReport = null;
if (site) {
  const origin = new URL(urls[0]).origin;
  const robotsRes = await fetch(`${origin}/robots.txt`);
  const robotsTxt = robotsRes.ok ? await robotsRes.text() : null;
  const sitemapRes = await fetch(`${origin}/sitemap.xml`);
  const sitemapXml = sitemapRes.ok ? await sitemapRes.text() : null;
  const sitemapUrls = sitemapXml ? [...sitemapXml.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1].trim()) : [];
  const siteProblems = [];
  if (!robotsTxt) siteProblems.push("no /robots.txt");
  else {
    if (/Disallow:\s*\/\s*$/m.test(robotsTxt)) siteProblems.push("robots.txt disallows everything — correct on staging, wrong on production");
    if (!/Sitemap:/i.test(robotsTxt)) siteProblems.push("robots.txt has no Sitemap: line");
  }
  if (!sitemapXml) siteProblems.push("no /sitemap.xml");
  // Compare by path: the sitemap lists the production domain (SITE_URL), even when checking localhost or staging.
  const pathOf = (u) => new URL(norm(u)).pathname;
  const notInSitemap = urls.filter((u) => !sitemapUrls.some((s) => pathOf(s) === pathOf(u)));
  const sitemapOrigins = [...new Set(sitemapUrls.map((u) => new URL(u).origin))];
  if (sitemapOrigins.some((o) => /localhost|127\.0\.0\.1/.test(o))) siteProblems.push(`sitemap lists localhost URLs (${sitemapOrigins.join(", ")}) — set SITE_URL`);
  if (sitemapXml && notInSitemap.length) siteProblems.push(`checked pages missing from the sitemap: ${notInSitemap.join(", ")}`);
  siteReport = { robotsTxt: robotsTxt?.slice(0, 400) ?? null, sitemapUrlCount: sitemapUrls.length, sitemapOrigins, problems: siteProblems };
}

console.log(
  JSON.stringify(
    {
      pages,
      duplicates: { titles: dupes("title"), descriptions: dupes("description") },
      site: siteReport,
      problemCount: pages.reduce((n, p) => n + p.problems.length, 0) + (siteReport?.problems.length ?? 0),
    },
    null,
    2,
  ),
);
