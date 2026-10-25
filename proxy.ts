import createIntlMiddleware from "next-intl/middleware";
import type { NextRequest } from "next/server";
import { routing } from "@/lib/i18n/routing";

// Locale negotiation + security headers (CLAUDE.md §6, PROJECT-SETUP §11).
// Next 16 name for middleware — never add a middleware.ts.

const handleI18nRouting = createIntlMiddleware(routing);

// Report-only to start: collect violations, then switch the header to `Content-Security-Policy`
// before launch. Add third-party origins (analytics, maps, video) here as they are agreed.
const CSP = [
  "default-src 'self'",
  // Development only: React and Turbopack use eval() for fast refresh and debugging. Never in production.
  `script-src 'self' 'unsafe-inline'${process.env.NODE_ENV === "development" ? " 'unsafe-eval'" : ""}`,
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob:",
  "font-src 'self'",
  "connect-src 'self'",
  "frame-ancestors 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "object-src 'none'",
].join("; ");

const SECURITY_HEADERS: Record<string, string> = {
  "Content-Security-Policy-Report-Only": CSP,
  "Strict-Transport-Security": "max-age=63072000; includeSubDomains",
  "X-Content-Type-Options": "nosniff",
  "Referrer-Policy": "strict-origin-when-cross-origin",
  "Permissions-Policy":
    "camera=(), microphone=(), geolocation=(), browsing-topics=()",
  "X-Frame-Options": "DENY",
};

export default function proxy(request: NextRequest) {
  const response = handleI18nRouting(request);
  for (const [name, value] of Object.entries(SECURITY_HEADERS))
    response.headers.set(name, value);
  return response;
}

export const config = {
  // Everything except API routes, Next internals and files with an extension (robots.txt, sitemap.xml, assets).
  matcher: "/((?!api|_next|_vercel|.*\\..*).*)",
};
