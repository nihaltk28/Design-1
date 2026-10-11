import { http, HttpResponse } from "msw";
import { siteSettings } from "./fixtures/site-settings";

// `*/path` matches any origin, so handlers work with the mock base URL and a real API_BASE_URL alike.
export const handlers = [
  http.get("*/site/settings", ({ request }) => {
    const locale = new URL(request.url).searchParams.get("locale");
    return HttpResponse.json(siteSettings[locale === "ar" ? "ar" : "en"]);
  }),
];
