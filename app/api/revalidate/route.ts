import { revalidateTag } from "next/cache";
import { z } from "zod";
import { clientIp, rateLimit } from "@/lib/security/rate-limit";
import { secretMatches } from "@/lib/security/secret";

// CMS publish webhook → refresh cached data by tag (CLAUDE.md §2, §6 Webhooks).
// The backend sends:  POST /api/revalidate
//                     X-Revalidate-Secret: <REVALIDATE_SECRET>
//                     Content-Type: application/json
//                     { "tags": ["news", "news:123"] }
// Only POST is exported, so every other method gets 405 from Next.
// Never log the secret or the request headers.

const MAX_BODY_BYTES = 4_096;
const TAG = /^[a-z0-9][a-z0-9:_-]{0,63}$/;
const BodySchema = z.object({
  tags: z.array(z.string().regex(TAG)).min(1).max(50),
});

export async function POST(request: Request) {
  const limit = rateLimit(`revalidate:${clientIp(request.headers)}`, {
    limit: 30,
    windowMs: 60_000,
  });
  if (!limit.ok) {
    return new Response(null, {
      status: 429,
      headers: { "Retry-After": String(limit.retryAfterSeconds) },
    });
  }

  if (
    !secretMatches(
      request.headers.get("x-revalidate-secret"),
      process.env.REVALIDATE_SECRET,
    )
  ) {
    return new Response(null, { status: 401 });
  }

  if (!request.headers.get("content-type")?.includes("application/json")) {
    return new Response(null, { status: 415 });
  }

  const declared = Number(request.headers.get("content-length") ?? 0);
  if (declared > MAX_BODY_BYTES) return new Response(null, { status: 413 });
  const raw = await request.text();
  if (Buffer.byteLength(raw) > MAX_BODY_BYTES)
    return new Response(null, { status: 413 });

  let json: unknown;
  try {
    json = JSON.parse(raw);
  } catch {
    return new Response(null, { status: 400 });
  }
  const parsed = BodySchema.safeParse(json);
  if (!parsed.success) return new Response(null, { status: 400 });

  const tags = [...new Set(parsed.data.tags)];
  // Route handlers can't use updateTag(); { expire: 0 } makes the next request fetch fresh data.
  for (const tag of tags) revalidateTag(tag, { expire: 0 });

  return Response.json({ revalidated: tags });
}
