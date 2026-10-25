import { http, HttpResponse } from "msw";
import type { HomePage } from "@/lib/schemas/home";
import type { SiteSettings } from "@/lib/schemas/site-settings";
import home from "./fixtures/home.json";
import settings from "./fixtures/site-settings.json";

// One copy of the mock data: fixtures/*.json, keyed by locale. lib/mocks/fixtures.test.ts checks every file
// against the Zod schemas, so the casts below can't hide a wrong shape.
type ByLocale<T> = Record<"en" | "ar", T>;
const homePage = home as ByLocale<HomePage>;
const siteSettings = settings as ByLocale<SiteSettings>;

const localeOf = (request: Request) =>
  new URL(request.url).searchParams.get("locale") === "ar" ? "ar" : "en";

// `*/path` matches any origin, so handlers work with the mock base URL and a real API_BASE_URL alike.
export const handlers = [
  http.get("*/site/settings", ({ request }) =>
    HttpResponse.json(siteSettings[localeOf(request)]),
  ),
  http.get("*/pages/home", ({ request }) =>
    HttpResponse.json(homePage[localeOf(request)]),
  ),
];
