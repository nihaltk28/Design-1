// Every mock JSON file matches the API contract (the Zod schemas the app validates responses with), in every
// locale — a typo here would break pages, so this catches it in `pnpm test` instead of in the browser.
import { describe, expect, test } from "vitest";
import { homePageSchema } from "@/lib/schemas/home";
import { siteSettingsSchema } from "@/lib/schemas/site-settings";
import home from "./fixtures/home.json";
import settings from "./fixtures/site-settings.json";

const FIXTURES = [
  ["home.json", home, homePageSchema],
  ["site-settings.json", settings, siteSettingsSchema],
] as const;

describe("mock fixtures match the API schemas", () => {
  for (const [file, data, schema] of FIXTURES) {
    for (const locale of ["en", "ar"] as const) {
      test(`${file} — ${locale}`, () => {
        const result = schema.safeParse(
          (data as Record<string, unknown>)[locale],
        );
        expect(result.success, result.success ? "" : result.error.message).toBe(
          true,
        );
      });
    }
  }
});
