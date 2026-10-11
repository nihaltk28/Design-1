// Markup gate: the server-rendered HTML of every template, in every locale, passes html-validate.
// axe checks the rendered page; this catches what axe misses — invalid nesting, duplicate IDs,
// unclosed tags — most often from CMS rich text. Rules: .htmlvalidate.json.
import { expect, test } from "@playwright/test";
import { FileSystemConfigLoader, HtmlValidate } from "html-validate/node";
import { routing } from "@/lib/i18n/routing";
import { PAGES, url } from "./pages";

// Without a loader, HtmlValidate ignores .htmlvalidate.json and uses only its built-in defaults.
const htmlvalidate = new HtmlValidate(new FileSystemConfigLoader());

for (const locale of routing.locales) {
  for (const path of PAGES) {
    test(`${locale} ${path}: valid HTML`, async ({ request }) => {
      const response = await request.get(url(locale, path));
      expect(response.ok()).toBe(true);

      const report = await htmlvalidate.validateString(await response.text(), `${locale}${path}`);
      const errors = report.results.flatMap((result) =>
        result.messages.map((m) => `${m.line}:${m.column} ${m.ruleId}: ${m.message}`),
      );
      expect(errors, "html-validate errors").toEqual([]);
    });
  }
}
