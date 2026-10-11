import { defineConfig, devices } from "@playwright/test";

// Dedicated port: with reuseExistingServer, a `next dev` of another project on 3000 would be tested instead.
const PORT = Number(process.env.E2E_PORT ?? 3100);

export default defineConfig({
  testDir: "tests/e2e",
  // Own subfolder: Playwright empties outputDir on start, which would delete the pipeline's unit-junit.xml.
  outputDir: "test-results/playwright",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI
    ? [["junit", { outputFile: "test-results/e2e-junit.xml" }], ["html", { open: "never" }]]
    : "list",
  use: {
    baseURL: `http://localhost:${PORT}`,
    trace: "retain-on-failure",
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  // Production build on MSW mocks, so data is stable (CLAUDE.md §1).
  webServer: {
    command: `NEXT_PUBLIC_USE_MOCKS=true pnpm build && pnpm start --port ${PORT}`,
    url: `http://localhost:${PORT}/en`,
    reuseExistingServer: !process.env.CI,
    timeout: 300_000,
    // SIGTERM lets `next start` stop its server process; the default SIGKILL leaves next-server
    // orphaned (own process group) holding the pipe, and the run hangs after the last test.
    // The "[WebServer] ELIFECYCLE … exit code 143" line at the end of every run is this SIGTERM — expected, not a failure.
    gracefulShutdown: { signal: "SIGTERM", timeout: 10_000 },
  },
});
