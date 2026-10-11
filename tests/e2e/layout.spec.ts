// Layout gate for the main templates: every locale × phone, tablet, laptop-scaling and desktop widths.
//   - no horizontal overflow (reports the elements that stick out)
//   - no axe violations (WCAG 2.2 AA tags) — automated-clean is NOT sign-off, see CLAUDE.md §4
//   - visual snapshots, opt-in with VISUAL=1 (`pnpm test:visual`); baselines are OS-specific,
//     so generate and compare them in the same Playwright Docker image CI uses
//
// Runs against a production build on MSW mocks (see playwright.config.ts) so data is stable.
import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";
import { routing } from "@/lib/i18n/routing";
import { PAGES, url } from "./pages";

// 320 phone · 768 tablet · 1280 = 1920 screen at 150% scaling · 1536 = 125% · 1920 desktop (styles/scaling.css)
const WIDTHS = [320, 768, 1280, 1536, 1920];

const AXE_TAGS = ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"];

async function open(page: Page, locale: string, path: string, width: number) {
  await page.setViewportSize({ width, height: 900 });
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto(url(locale, path));
  await page.evaluate(() => document.fonts.ready);
}

for (const locale of routing.locales) {
  for (const path of PAGES) {
    for (const width of WIDTHS) {
      test.describe(`${locale} ${path} @${width}px`, () => {
        test("no horizontal overflow", async ({ page }) => {
          await open(page, locale, path, width);

          const offenders = await page.evaluate(() => {
            const vw = document.documentElement.clientWidth;
            return [...document.querySelectorAll("body *")]
              .filter((el) => {
                const r = el.getBoundingClientRect();
                return r.width > 0 && (r.right > vw + 1 || r.left < -1);
              })
              .slice(0, 10)
              .map((el) => `${el.tagName.toLowerCase()}${el.id ? `#${el.id}` : ""}.${[...el.classList].join(".")}`);
          });
          const overflows = await page.evaluate(
            () => document.documentElement.scrollWidth > document.documentElement.clientWidth,
          );

          expect(overflows, `Elements past the viewport edge:\n${offenders.join("\n")}`).toBe(false);
        });

        test("no axe violations", async ({ page }) => {
          await open(page, locale, path, width);
          const { violations } = await new AxeBuilder({ page }).withTags(AXE_TAGS).analyze();
          expect(
            violations.map((v) => `${v.id}: ${v.help} (${v.nodes.length}×)`),
          ).toEqual([]);
        });

        test("visual snapshot", async ({ page }) => {
          test.skip(!process.env.VISUAL, "Set VISUAL=1 to compare screenshots");
          await open(page, locale, path, width);
          await expect(page).toHaveScreenshot(`${locale}${path.replaceAll("/", "_")}-${width}.png`, {
            fullPage: true,
            animations: "disabled",
          });
        });
      });
    }
  }
}
