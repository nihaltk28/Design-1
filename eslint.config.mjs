import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";
import projectRules from "./eslint.project-rules.mjs";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    // Test, Storybook and MSW output:
    "playwright-report/**",
    "test-results/**",
    "storybook-static/**",
    "coverage/**",
    "public/mockServiceWorker.js",
  ]),
  // Project rules (CLAUDE.md §3–§7) — keep last so they win.
  ...projectRules,
]);

export default eslintConfig;
