import bundleAnalyzer from "@next/bundle-analyzer";
import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";
import { redirects } from "./redirects";

const withNextIntl = createNextIntlPlugin("./lib/i18n/request.ts");
const withBundleAnalyzer = bundleAnalyzer({
  enabled: process.env.ANALYZE === "true",
});

const nextConfig: NextConfig = {
  images: {
    formats: ["image/avif", "image/webp"],
    // Register the API's image hosts here once known (CLAUDE.md §5).
    remotePatterns: [],
  },
  // No public source maps in production (CLAUDE.md §6).
  productionBrowserSourceMaps: false,
  poweredByHeader: false,
  // Stop `next dev` injecting its agent-rules block into our CLAUDE.md / creating AGENTS.md.
  agentRules: false,
  // Old site URL → new URL map (redirects.ts) — this project replaces an existing site (CLAUDE.md "Project").
  async redirects() {
    return redirects;
  },
};

export default withBundleAnalyzer(withNextIntl(nextConfig));
