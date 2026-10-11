import type { NextConfig } from "next";

type Redirect = Awaited<
  ReturnType<NonNullable<NextConfig["redirects"]>>
>[number];

// Old site URL → new URL, 301 (PROJECT-SETUP §9). Fill from the old-site crawl and Search Console's top pages;
// every row gets a Playwright assertion. Example:
//   { source: "/en/old-news/:slug", destination: "/en/news/:slug", permanent: true },
export const redirects: Redirect[] = [];
