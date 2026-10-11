// Automated half of the a11y-audit skill: structure, axe (WCAG 2.2 AA), skip link, list markup and a
// keyboard focus walk for one URL at one width. Uses the project's own @playwright/test and
// @axe-core/playwright — no CDN scripts (CLAUDE.md §5).
//
//   node .claude/skills/a11y-audit/audit.mjs http://localhost:3100/en/news --width=320 --tabs=40
//
// Prints JSON. It does NOT replace the manual keyboard, screen-reader and visual checks in SKILL.md.
import AxeBuilder from "@axe-core/playwright";
import { chromium } from "@playwright/test";

const [url, ...flags] = process.argv.slice(2);
if (!url) {
  console.error("Usage: node .claude/skills/a11y-audit/audit.mjs <url> [--width=1440] [--tabs=40]");
  process.exit(2);
}
const opt = (name, fallback) => Number(flags.find((f) => f.startsWith(`--${name}=`))?.split("=")[1] ?? fallback);
const width = opt("width", 1440);
const tabs = opt("tabs", 40);

const WCAG_TAGS = ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"];

const browser = await chromium.launch();
try {
  // AxeBuilder needs a page from an explicit context, not browser.newPage().
  const context = await browser.newContext({ viewport: { width, height: 900 } });
  const page = await context.newPage();
  await page.emulateMedia({ reducedMotion: "reduce" });
  const response = await page.goto(url, { waitUntil: "networkidle" });
  await page.evaluate(() => document.fonts.ready);

  const structure = await page.evaluate(() => {
    const headings = [...document.querySelectorAll("h1,h2,h3,h4,h5,h6")].map((h) => ({
      level: Number(h.tagName[1]),
      text: (h.textContent ?? "").trim().slice(0, 60),
    }));
    const skipped = [];
    headings.forEach((h, i) => {
      const prev = i === 0 ? 0 : headings[i - 1].level;
      if (h.level > prev + 1) skipped.push(`h${prev || "-"} → h${h.level} ("${h.text}")`);
    });

    const navs = [...document.querySelectorAll("nav,[role=navigation]")].map((n) => {
      const by = n.getAttribute("aria-labelledby");
      return n.getAttribute("aria-label") || (by && document.getElementById(by)?.textContent?.trim()) || null;
    });
    const navNames = navs.filter(Boolean);
    const main = document.querySelector("main");

    // Skip link: first focusable element should be an in-page link to a focusable target.
    const focusable = document.querySelector(
      'a[href], button, input, select, textarea, [tabindex]:not([tabindex="-1"])',
    );
    const skipHref = focusable?.getAttribute("href");
    const skipTarget = skipHref?.startsWith("#") ? document.getElementById(skipHref.slice(1)) : null;

    // Repeated links/cards in a <div> instead of a list.
    const listSuspects = [...document.querySelectorAll("main div")]
      .filter((d) => [...d.children].filter((c) => ["A", "ARTICLE"].includes(c.tagName)).length > 2)
      .slice(0, 10)
      .map((d) => (d.id ? `div#${d.id}` : `div.${[...d.classList].slice(0, 3).join(".")}`));

    return {
      lang: document.documentElement.lang || null,
      dir: document.documentElement.dir || null,
      title: document.title,
      h1Count: headings.filter((h) => h.level === 1).length,
      headings,
      skippedHeadingLevels: skipped,
      landmarks: {
        header: !!document.querySelector("header,[role=banner]"),
        main: !!main,
        footer: !!document.querySelector("footer,[role=contentinfo]"),
        navCount: navs.length,
        unlabelledNavs: navs.filter((n) => !n).length,
        duplicateNavNames: navNames.filter((n, i) => navNames.indexOf(n) !== i),
      },
      skipLink: {
        firstFocusable: focusable ? `${focusable.tagName.toLowerCase()} ${skipHref ?? ""}`.trim() : null,
        isSkipLink: !!skipHref?.startsWith("#"),
        targetExists: !!skipTarget,
        // Without tabindex="-1" on a non-focusable target, activating the link scrolls but focus stays put.
        targetFocusable: !!skipTarget && (skipTarget.tabIndex >= 0 || skipTarget.getAttribute("tabindex") === "-1"),
      },
      listMarkupSuspects: listSuspects,
    };
  });

  const axe = await new AxeBuilder({ page }).withTags(WCAG_TAGS).analyze();
  const violations = axe.violations.map((v) => ({
    id: v.id,
    impact: v.impact,
    help: v.help,
    nodes: v.nodes.length,
    samples: v.nodes.slice(0, 3).map((n) => ({ target: n.target.join(" "), summary: n.failureSummary })),
  }));

  // Keyboard focus walk: one Tab at a time; record where focus lands and whether it's visibly styled.
  // Start from the top of the document without clicking — a click can land on a link and navigate away.
  const walk = [];
  const startUrl = page.url();
  await page.evaluate(() => {
    (document.activeElement instanceof HTMLElement ? document.activeElement : null)?.blur();
    window.scrollTo(0, 0);
  });
  for (let i = 0; i < tabs; i++) {
    await page.keyboard.press("Tab");
    const step = await page.evaluate(() => {
      const el = document.activeElement;
      if (!el || el === document.body) return { onBody: true };
      const cs = getComputedStyle(el);
      const rect = el.getBoundingClientRect();
      const name = (el.getAttribute("aria-label") || el.textContent || el.getAttribute("title") || "").trim();
      return {
        el: `${el.tagName.toLowerCase()}${el.id ? `#${el.id}` : ""}${el.getAttribute("href") ? ` ${el.getAttribute("href")}` : ""}`,
        name: name.slice(0, 40),
        visibleFocus: (cs.outlineStyle !== "none" && parseFloat(cs.outlineWidth) > 0) || cs.boxShadow !== "none",
        onScreen: rect.width > 0 && rect.height > 0,
      };
    });
    walk.push(step);
  }
  const seen = walk.filter((s) => !s.onBody).map((s) => s.el);
  // Tab alone must never navigate. If the URL changed, something hijacked focus or keys.
  const urlChangedDuringWalk = page.url() !== startUrl;

  console.log(
    JSON.stringify(
      {
        url,
        width,
        status: response?.status() ?? null,
        structure,
        axe: { violationCount: violations.length, violations },
        keyboard: {
          tabsPressed: tabs,
          urlChangedDuringWalk,
          // A body step just before focus returns to the first stop — or as the very last press — is the
          // normal wrap-around past the end of the page, not a bug.
          focusLostToBody: walk.filter((s, i) => s.onBody && i < walk.length - 1 && walk[i + 1]?.el !== seen[0]).length,
          wrappedAround: walk.some((s, i) => s.onBody && (i === walk.length - 1 || walk[i + 1]?.el === seen[0])),
          withoutVisibleFocus: [...new Set(walk.filter((s) => !s.onBody && !s.visibleFocus).map((s) => s.el))],
          offScreenFocus: [...new Set(walk.filter((s) => !s.onBody && !s.onScreen).map((s) => s.el))],
          withoutAccessibleName: [...new Set(walk.filter((s) => !s.onBody && !s.name).map((s) => s.el))],
          distinctStops: new Set(seen).size,
          order: seen.slice(0, 25),
        },
      },
      null,
      2,
    ),
  );
} finally {
  await browser.close();
}
