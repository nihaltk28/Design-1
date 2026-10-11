// Smoke: the home page works in every locale — lang/dir, axe, security headers, skip link.
import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";
import { directionOf, routing } from "@/lib/i18n/routing";
import { url } from "./pages";

const REQUIRED_HEADERS = [
  "content-security-policy-report-only",
  "strict-transport-security",
  "x-content-type-options",
  "referrer-policy",
  "permissions-policy",
  "x-frame-options",
];

for (const locale of routing.locales) {
  test.describe(`${locale} home`, () => {
    test("loads with the right lang and dir", async ({ page }) => {
      const response = await page.goto(url(locale, "/"));
      expect(response?.status()).toBe(200);
      await expect(page.locator("html")).toHaveAttribute("lang", locale);
      await expect(page.locator("html")).toHaveAttribute("dir", directionOf(locale));
      await expect(page.getByRole("heading", { level: 1 })).toHaveCount(1);
    });

    test("sends the security headers", async ({ request }) => {
      const response = await request.get(url(locale, "/"));
      const headers = response.headers();
      for (const name of REQUIRED_HEADERS) expect(headers[name], name).toBeTruthy();
    });

    test("has no axe violations", async ({ page }) => {
      await page.goto(url(locale, "/"));
      const { violations } = await new AxeBuilder({ page }).analyze();
      expect(violations.map((v) => `${v.id}: ${v.help}`)).toEqual([]);
    });

    test("first Tab focuses a visible skip link", async ({ page }) => {
      await page.goto(url(locale, "/"));
      await page.keyboard.press("Tab");
      const focused = page.locator(":focus");
      await expect(focused).toHaveAttribute("href", "#main");
      await expect(focused).toBeVisible();
      const box = await focused.boundingBox();
      expect(box && box.width > 1 && box.height > 1).toBe(true);
    });

    test("unknown path returns a real 404", async ({ request }) => {
      const response = await request.get(url(locale, "/this-page-does-not-exist"));
      expect(response.status()).toBe(404);
    });
  });
}

test("root redirects to the default locale", async ({ page }) => {
  await page.goto("/");
  await expect(page).toHaveURL(new RegExp(`/${routing.defaultLocale}$`));
});
