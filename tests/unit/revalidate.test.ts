// @vitest-environment node
// The CMS publish webhook refuses everything except a correctly signed, well-formed POST (CLAUDE.md §6).
// No webhook in this project? /scaffold deletes this file together with app/api/revalidate/.
import { beforeEach, describe, expect, test, vi } from "vitest";

const revalidateTag = vi.fn();
vi.mock("next/cache", () => ({ revalidateTag }));

const { POST } = await import("@/app/api/revalidate/route");
const { resetRateLimits } = await import("@/lib/security/rate-limit");

const SECRET = "test-revalidate-secret";

function call({
  secret = SECRET as string | null,
  body = JSON.stringify({ tags: ["news", "news:123"] }) as string,
  contentType = "application/json",
  ip = "203.0.113.7",
} = {}) {
  const headers = new Headers({ "content-type": contentType, "x-forwarded-for": ip });
  if (secret !== null) headers.set("x-revalidate-secret", secret);
  return POST(new Request("http://localhost/api/revalidate", { method: "POST", headers, body }));
}

describe("POST /api/revalidate", () => {
  beforeEach(() => {
    vi.stubEnv("REVALIDATE_SECRET", SECRET);
    revalidateTag.mockClear();
    resetRateLimits();
  });

  test("valid request revalidates each tag once, immediately", async () => {
    const res = await call({ body: JSON.stringify({ tags: ["news", "news", "news:123"] }) });
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ revalidated: ["news", "news:123"] });
    expect(revalidateTag).toHaveBeenCalledTimes(2);
    expect(revalidateTag).toHaveBeenCalledWith("news", { expire: 0 });
  });

  test("wrong or missing secret → 401, nothing revalidated", async () => {
    expect((await call({ secret: "wrong" })).status).toBe(401);
    expect((await call({ secret: null })).status).toBe(401);
    expect(revalidateTag).not.toHaveBeenCalled();
  });

  test("unset REVALIDATE_SECRET refuses everyone", async () => {
    vi.stubEnv("REVALIDATE_SECRET", "");
    expect((await call({ secret: "" })).status).toBe(401);
  });

  test("not JSON → 415; oversized body → 413; malformed or invalid tags → 400", async () => {
    expect((await call({ contentType: "text/plain" })).status).toBe(415);
    expect((await call({ body: JSON.stringify({ tags: ["a".repeat(5_000)] }) })).status).toBe(413);
    expect((await call({ body: "{not json" })).status).toBe(400);
    expect((await call({ body: JSON.stringify({ tags: [] }) })).status).toBe(400);
    expect((await call({ body: JSON.stringify({ tags: ["<script>"] }) })).status).toBe(400);
    expect(revalidateTag).not.toHaveBeenCalled();
  });

  test("more than 30 calls a minute from one IP → 429 with Retry-After", async () => {
    for (let i = 0; i < 30; i++) await call({ secret: "wrong" });
    const res = await call();
    expect(res.status).toBe(429);
    expect(res.headers.get("retry-after")).toBeTruthy();
  });

  test("only POST is exported, so other methods get 405 from Next", async () => {
    const route = await import("@/app/api/revalidate/route");
    expect(Object.keys(route)).toEqual(["POST"]);
  });
});
