import path from "node:path";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vitest/config";

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@/components": path.resolve("components"),
      "@/lib": path.resolve("lib"),
      "@/styles": path.resolve("styles"),
      "@": path.resolve("."),
      // server-only throws outside a React Server Component bundle; make it a no-op in tests.
      "server-only": path.resolve("tests/empty.ts"),
    },
  },
  test: {
    environment: "jsdom",
    exclude: ["tests/e2e/**", "node_modules/**"],
  },
});
