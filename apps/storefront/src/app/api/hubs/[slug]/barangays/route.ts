import { NextRequest, NextResponse } from "next/server"

const BACKEND_URL =
  process.env.NEXT_PUBLIC_MEDUSA_BACKEND_URL ?? "http://localhost:9000"
const PUBLISHABLE_KEY = process.env.NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY ?? ""

/**
 * GET /api/hubs/:slug/barangays
 *
 * Same-origin proxy for the backend barangay list. Client components must
 * not call the Medusa backend directly: the browser may be on a tunnelled
 * domain (or another device) where the backend host isn't reachable, and an
 * https page can't fetch an http backend at all. The Next server, which can
 * always reach the backend, forwards the request instead.
 */
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params
  try {
    const res = await fetch(
      `${BACKEND_URL}/store/hubs/${encodeURIComponent(slug)}/barangays`,
      {
        headers: { "x-publishable-api-key": PUBLISHABLE_KEY },
        // Barangay lists change rarely (admin edits); a short TTL keeps the
        // combobox snappy without going stale for long.
        next: { revalidate: 300, tags: [`hub-${slug}-barangays`] },
      }
    )
    const body = await res.json().catch(() => ({ error: "invalid response" }))
    return NextResponse.json(body, { status: res.status })
  } catch {
    return NextResponse.json(
      { error: "backend unreachable" },
      { status: 502 }
    )
  }
}
