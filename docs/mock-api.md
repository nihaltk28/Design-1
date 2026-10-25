# Mock API — integrate it and watch the data flow

A small HTTP server that stands in for the .NET backend: `lib/mocks/api-server/server.mjs`. It serves the same
fixture files as the in-process MSW mocks (`lib/mocks/fixtures/*.json`), so there is still one copy of the data.
Every request is logged, so you can see exactly when the website asks for what.

## The endpoints

| Request | Answer | Fixture |
|---|---|---|
| `GET /pages/home?locale=en` · `ar` | The home page content (below) | `lib/mocks/fixtures/home.json` |
| `GET /site/settings?locale=en` · `ar` | Site name, tagline, announcement bar | `lib/mocks/fixtures/site-settings.json` |
| `GET /` | List of endpoints | — |
| `GET /health` | `{ "ok": true }` | — |

Errors come back as JSON with a status: `400` unknown locale · `404` unknown path · `405` not a GET · `500`
simulated failure.

Open http://localhost:3001/pages/home?locale=en in the browser to read the real JSON the site receives.

## Integrate it — step by step

1. **Start the API** in its own terminal (leave it running — this is where the log appears):
   ```bash
   pnpm mock:api
   ```
2. **Point the website at it** — in `.env.local` (not committed):
   ```
   API_BASE_URL=http://localhost:3001
   NEXT_PUBLIC_USE_MOCKS=false
   ```
   `NEXT_PUBLIC_USE_MOCKS=false` matters: when it's `true`, the site answers itself from MSW in memory and never
   calls the network.
3. **Restart the site** (`NEXT_PUBLIC_*` values are read when the site starts or builds):
   - dev: stop and run `pnpm dev` again;
   - production: `pnpm build` then `pnpm start`.
4. **Open the site** and watch the API terminal.

To go back to the in-memory mocks: empty `API_BASE_URL` and set `NEXT_PUBLIC_USE_MOCKS=true` again.

## What you'll see — and why

- **`pnpm dev`:** the first page load asks the API (home + settings for that language). After that, a normal
  reload uses Next's data cache for the time limit (home 10 min, settings 1 h) — no request. A **hard reload**
  (`Ctrl+Shift+R`) skips the cache and asks the API again.
- **`pnpm build`:** the requests happen **during the build** (4 of them: home + settings × en + ar), then never
  for visitors. The home page is pre-built static HTML (CLAUDE.md §2). After its time limit (home 10 min,
  settings 1 h) the next visit triggers one quiet background refresh.
- **A build may make no requests at all.** Next keeps every response in its data cache (`.next/cache/fetch-cache`)
  until the time limit runs out, and a new build reuses it. So a rebuild within 10 minutes shows the *old* data
  and the API log stays empty. To force fresh data, delete that folder before building:
  ```bash
  rm -rf .next/cache/fetch-cache
  ```
  (On a live site the backend calls `/api/revalidate` with the tag instead — `home` or `settings`.)
- **Edit `lib/mocks/fixtures/home.json`** (e.g. a card title) while the API runs: the API re-reads the file on every
  request. In dev, hard-reload the page (`Ctrl+Shift+R`); in production, clear the data cache as above and rebuild.

## Which part of the JSON goes where

`GET /pages/home` → `lib/api/home.ts` (`getHomePage`) → checked by `lib/schemas/home.ts` → `HomeTemplate`, which hands
each key to its component:

| JSON key | What it is | Component |
|---|---|---|
| `seo` | Page title and description for search and sharing | `app/[locale]/(public)/page.tsx` (`generateMetadata`) |
| `hero` | Eyebrow, headline, text, two buttons | `HomeHero.tsx` (stage 1) |
| `galleries` | 4 gallery cards around the black hole + tagline | `GalleriesStage.tsx` (stage 2) |
| `journey` | 7 steps + the places where you can see them | `JourneyStage.tsx` (stage 3) |
| `dome` | Planetarium text block | `DomeStage.tsx` (stage 4) |
| `exhibits` | 6 featured objects + title | `ExhibitsStage.tsx` (stage 5) |
| `compare` | Ticket comparison table | `CompareStage.tsx` (stage 6) |
| `explore` | 6 links around the hole | `ExploreStage.tsx` (stage 7) |
| `stages` | The side menu and the "Stage" readout | `HeroJourney.tsx` |

`GET /site/settings` → `lib/api/site-settings.ts` → the layout: header (`siteName`, `tagline`), the announcement bar
(`announcement`), and the `Museum` JSON-LD (`organization`, optional).

Interface words (buttons, menu, "Scroll to dive in") are **not** in the API — they're in `messages/en.json` /
`messages/ar.json`.

## Experiments

Start the API with an environment variable, then hard-reload the site in dev (`Ctrl+Shift+R`) — or, for a production build, clear the data
cache first (above), or the build reuses the last good responses and you won't see the failure:

| Try | Command | What the site does |
|---|---|---|
| A slow backend | `MOCK_API_DELAY=3000 pnpm mock:api` | Pages wait 3 s for data |
| A backend that hangs | `MOCK_API_DELAY=10000 pnpm mock:api` | After 8 s the request times out (`lib/api/client.ts`) → fallback |
| Home content fails | `MOCK_API_FAIL=home pnpm mock:api` | The home page shows "couldn't be loaded" — header and bar still work |
| Settings fail | `MOCK_API_FAIL=settings pnpm mock:api` | No announcement bar; the header uses the translated site name |
| Wrong data | Delete a required field in `home.json` | Zod rejects it at the boundary → same fallback, error in the server log |

(On PowerShell, set the variable first: `$env:MOCK_API_FAIL="home"; pnpm mock:api`.)

## When the real .NET API arrives

Set `API_BASE_URL` to its address — nothing else changes. If its JSON differs from these fixtures, the Zod schemas
in `lib/schemas` say exactly which field — agree the shape with the backend owner (the schemas are the contract).
