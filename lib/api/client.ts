import "server-only";
import { cookies } from "next/headers";
import type { z } from "zod";
import { ApiError } from "./errors";

// The only place fetch is called (CLAUDE.md §2–3). Every data call is one of:
//   getPublic  — identical for every visitor → cached with tags + a time limit
//   getPrivate — per-user / per-request      → never cached, forwards the session

const DEFAULT_TIMEOUT_MS = 8_000;
/** Base URL MSW intercepts when NEXT_PUBLIC_USE_MOCKS=true and no API_BASE_URL is set (CI, first run). */
export const MOCK_API_BASE_URL = "https://api.mock.invalid";
/** Name of the httpOnly session cookie forwarded by getPrivate. Decided with the auth design (CLAUDE.md §10). */
const SESSION_COOKIE = "session";

const USE_MOCKS = process.env.NEXT_PUBLIC_USE_MOCKS === "true";

// MSW must be listening in every process that fetches — including `next build` prerender workers,
// where instrumentation.ts register() does not run — so it's started here, once per process.
let mocksReady: Promise<void> | undefined;
function ensureMocks(): Promise<void> {
  mocksReady ??= import("@/lib/mocks/server").then(({ server }) => {
    server.listen({ onUnhandledRequest: "bypass" });
  });
  return mocksReady;
}

function baseUrl(path: string): string {
  const configured = process.env.API_BASE_URL;
  if (configured) return configured.replace(/\/$/, "");
  if (USE_MOCKS) return MOCK_API_BASE_URL;
  throw new ApiError("config", path, "API_BASE_URL is not set");
}

/** Encode each path segment once, here — never in callers (PROJECT-SETUP §5.2). */
function buildUrl(path: string): string {
  const [pathname, query] = path.split("?", 2);
  const encoded = pathname
    .split("/")
    .map((segment) => encodeURIComponent(decodeURIComponent(segment)))
    .join("/");
  return `${baseUrl(path)}${encoded.startsWith("/") ? "" : "/"}${encoded}${query ? `?${query}` : ""}`;
}

async function request<T extends z.ZodType>(
  path: string,
  schema: T,
  init: RequestInit & { next?: { tags?: string[]; revalidate?: number | false } },
  timeoutMs: number,
): Promise<z.infer<T>> {
  if (USE_MOCKS) await ensureMocks();
  let response: Response;
  try {
    response = await fetch(buildUrl(path), {
      ...init,
      headers: { Accept: "application/json", ...init.headers },
      signal: AbortSignal.timeout(timeoutMs),
    });
  } catch (error) {
    if (error instanceof ApiError) throw error;
    const timedOut = error instanceof DOMException && error.name === "TimeoutError";
    throw new ApiError(timedOut ? "timeout" : "network", path, `${path}: ${String(error)}`);
  }

  if (!response.ok) {
    throw new ApiError("http", path, `${path}: HTTP ${response.status}`, response.status);
  }

  const parsed = schema.safeParse(await response.json().catch(() => undefined));
  if (!parsed.success) {
    throw new ApiError("invalid-response", path, `${path}: response failed validation — ${parsed.error.message}`);
  }
  return parsed.data;
}

type PublicOptions<T extends z.ZodType> = {
  schema: T;
  /** Cache tags, e.g. ["news", "news:123"] — revalidated by app/api/revalidate. */
  tags: string[];
  /** Seconds before the cached response is refreshed even without a webhook. */
  revalidate: number;
  timeoutMs?: number;
};

/** Data identical for every visitor. Cached and shared across requests. Never pass per-user data here. */
export function getPublic<T extends z.ZodType>(path: string, options: PublicOptions<T>) {
  const { schema, tags, revalidate, timeoutMs = DEFAULT_TIMEOUT_MS } = options;
  return request(path, schema, { next: { tags, revalidate } }, timeoutMs);
}

type PrivateOptions<T extends z.ZodType> = { schema: T; timeoutMs?: number };

/** Per-user or per-request data. Never cached; forwards the session cookie. */
export async function getPrivate<T extends z.ZodType>(path: string, options: PrivateOptions<T>) {
  const { schema, timeoutMs = DEFAULT_TIMEOUT_MS } = options;
  const session = (await cookies()).get(SESSION_COOKIE)?.value;
  return request(
    path,
    schema,
    {
      cache: "no-store",
      headers: session ? { Authorization: `Bearer ${session}` } : {},
    },
    timeoutMs,
  );
}
