// Dev-only mock HTTP API for the home page — a stand-in for the .NET backend until it exists.
// It serves the SAME fixtures as the in-process MSW mocks (lib/mocks/fixtures/*.json), so there's one copy of
// the data. Every request is logged, so you can watch the website ask for its data.
//
//   pnpm mock:api                      → http://localhost:3001
//
// Point the website at it (.env.local), then restart / rebuild the site:
//   API_BASE_URL=http://localhost:3001
//   NEXT_PUBLIC_USE_MOCKS=false
//
// Experiments (environment variables when starting the API):
//   MOCK_API_PORT=3002                 another port
//   MOCK_API_DELAY=3000                answer every request 3 s late (the site times out after 8 s)
//   MOCK_API_FAIL=home                 /pages/home answers 500 (also: settings, all) → see the fallbacks
//
// Never used in production: the website only calls it when API_BASE_URL points here.
import { createServer } from "node:http";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";

const here = path.dirname(fileURLToPath(import.meta.url));
const FIXTURES = path.resolve(here, "../fixtures");
const LOCALES = ["en", "ar"];

/** The endpoints, as the backend will offer them: path → fixture file (one object per locale). */
const ENDPOINTS = {
  "/pages/home": {
    fixture: "home.json",
    fail: "home",
    about: "Home page content: hero and the seven stages",
  },
  "/site/settings": {
    fixture: "site-settings.json",
    fail: "settings",
    about: "Site name, tagline, announcement bar",
  },
};

// Read on every request, so edits to the fixture files show up without restarting the API.
const readFixture = (file) =>
  JSON.parse(readFileSync(path.join(FIXTURES, file), "utf8"));

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Builds the mock API server (not listening yet).
 * @param {{ delayMs?: number, fail?: string, log?: (line: string) => void }} [options]
 */
export function createMockApi({ delayMs = 0, fail = "", log = () => {} } = {}) {
  return createServer(async (req, res) => {
    const started = Date.now();
    const url = new URL(req.url ?? "/", "http://localhost");
    const locale = url.searchParams.get("locale");

    const send = (status, body) => {
      const json = JSON.stringify(body, null, 2);
      res.writeHead(status, {
        "Content-Type": "application/json; charset=utf-8",
        "Cache-Control": "no-store",
      });
      res.end(json);
      log(
        `${new Date().toISOString().slice(11, 19)}  ${req.method} ${url.pathname}${url.search}`.padEnd(
          48,
        ) +
          `→ ${status}  ${String(Date.now() - started).padStart(5)} ms  ${(Buffer.byteLength(json) / 1024).toFixed(1)} KB`,
      );
    };

    if (req.method !== "GET")
      return send(405, {
        error: "Method not allowed — this API is read-only.",
      });

    // An overview of the API, for a browser visit.
    if (url.pathname === "/") {
      return send(200, {
        name: "Event Horizon mock API",
        endpoints: Object.entries(ENDPOINTS).map(([route, e]) => ({
          url: `${route}?locale=en`,
          locales: LOCALES,
          about: e.about,
        })),
      });
    }
    if (url.pathname === "/health") return send(200, { ok: true });

    const endpoint = ENDPOINTS[url.pathname];
    if (!endpoint)
      return send(404, {
        error: `No endpoint ${url.pathname}. See / for the list.`,
      });
    if (!LOCALES.includes(locale ?? "")) {
      return send(400, {
        error: `locale must be one of: ${LOCALES.join(", ")}`,
      });
    }

    if (delayMs) await sleep(delayMs);
    if (fail === "all" || fail === endpoint.fail) {
      return send(500, { error: `Simulated failure (MOCK_API_FAIL=${fail})` });
    }

    try {
      return send(200, readFixture(endpoint.fixture)[locale]);
    } catch (error) {
      return send(500, {
        error: `Couldn't read ${endpoint.fixture}: ${error.message}`,
      });
    }
  });
}

// Started directly (pnpm mock:api): listen and log.
if (
  process.argv[1] &&
  path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)
) {
  const port = Number(process.env.MOCK_API_PORT ?? 3001);
  const delayMs = Number(process.env.MOCK_API_DELAY ?? 0);
  const fail = process.env.MOCK_API_FAIL ?? "";
  createMockApi({ delayMs, fail, log: (line) => console.log(line) }).listen(
    port,
    () => {
      console.log(`Mock API on http://localhost:${port}`);
      for (const route of Object.keys(ENDPOINTS))
        console.log(`  GET http://localhost:${port}${route}?locale=en|ar`);
      if (delayMs) console.log(`  delay: ${delayMs} ms`);
      if (fail) console.log(`  failing: ${fail}`);
      console.log(
        "Point the site at it: API_BASE_URL=http://localhost:" +
          port +
          " and NEXT_PUBLIC_USE_MOCKS=false\n",
      );
    },
  );
}
