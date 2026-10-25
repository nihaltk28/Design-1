import { getResponse } from "msw";
import { handlers } from "./handlers";

// Server-side mocks — used by lib/api/client.ts when NEXT_PUBLIC_USE_MOCKS=true (dev, tests, `next build` workers).
//
// The request is answered straight from the MSW handlers: no network and no patching of the global `fetch`.
// (setupServer().listen() patched `fetch`, and `next dev` puts its own `fetch` back after every hot reload —
// so every mocked request failed until the dev server was restarted.)

/** The mocked response for a request, or undefined when no handler matches (then the real network is used). */
export function mockResponse(
  url: string,
  init: RequestInit,
): Promise<Response | undefined> {
  return getResponse(handlers, new Request(url, init));
}
