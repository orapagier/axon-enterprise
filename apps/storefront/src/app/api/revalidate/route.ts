import { revalidateTag } from "next/cache"
import { cookies as nextCookies } from "next/headers"
import { NextRequest, NextResponse } from "next/server"

/**
 * Dev-time cache invalidation endpoint.
 *
 *   POST /api/revalidate
 *   Body: { tags?: string[] }   default: ["products", "regions", "categories", "collections", "customers", "carts"]
 *
 * The storefront uses tag-keyed Next.js fetch caches scoped to a per-visitor
 * `_medusa_cache_id` cookie. After running a backend seed (e.g.
 * `seed-mfh-catalog.ts`) the storefront still serves the pre-seed snapshot
 * because the tags were never invalidated on this side. Hit this endpoint to
 * flush the relevant tags for the calling browser session.
 *
 * The request must include the `_medusa_cache_id` cookie that the middleware
 * already set on a prior visit. We re-derive the same `{tag}-{cacheId}` keys
 * the data layer uses.
 */

const DEFAULT_TAGS = [
  "products",
  "regions",
  "categories",
  "collections",
  "customers",
  "carts",
  "seller-listings",
]

export async function POST(req: NextRequest) {
  const body = (await req.json().catch(() => ({}))) as { tags?: unknown }
  const requestedTags =
    Array.isArray(body.tags) && body.tags.every((t) => typeof t === "string")
      ? (body.tags as string[])
      : DEFAULT_TAGS

  const cookies = await nextCookies()
  const cacheId = cookies.get("_medusa_cache_id")?.value

  if (!cacheId) {
    // No cache id means there's nothing keyed to this session yet — fresh
    // requests will fetch from the backend anyway. Treat as a no-op success.
    return NextResponse.json({
      ok: true,
      revalidated: [],
      note: "No _medusa_cache_id cookie present; nothing to invalidate.",
    })
  }

  const revalidated = requestedTags.map((tag) => `${tag}-${cacheId}`)
  for (const fullTag of revalidated) {
    revalidateTag(fullTag)
  }

  return NextResponse.json({ ok: true, revalidated })
}

export async function GET() {
  // Cheap discoverability for "what does this do?"
  return NextResponse.json({
    usage:
      "POST { tags?: string[] } — flushes Next.js fetch cache tags keyed to your _medusa_cache_id cookie.",
    defaultTags: DEFAULT_TAGS,
  })
}
