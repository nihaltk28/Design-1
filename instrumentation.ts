import type { Instrumentation } from "next";

// Error monitoring: none — server errors go to the server logs (CLAUDE.md §1).
// MSW is not started here: lib/api/client.ts starts it, so it also runs inside `next build` workers.

export function register() {}

export const onRequestError: Instrumentation.onRequestError = (
  error,
  request,
  context,
) => {
  // Never log request headers — they carry cookies and secrets (CLAUDE.md §6).
  console.error(
    "[request error]",
    request.method,
    request.path,
    context.routeType,
    error,
  );
};
