import { NextRequest, NextResponse } from "next/server"

import { getAuthHeaders } from "@lib/data/cookies"

/**
 * POST /api/assistant
 *
 * Relays a chat turn from the browser to the Medusa backend's /store/assistant
 * endpoint, attaching the customer's bearer token from the httpOnly cookie so
 * it never reaches client JS — same proxy pattern as /api/seller/upload.
 */

const BACKEND_URL =
  process.env.MEDUSA_BACKEND_URL ||
  process.env.NEXT_PUBLIC_MEDUSA_BACKEND_URL ||
  "http://localhost:9000"
const PUBLISHABLE_KEY = process.env.NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY ?? ""

export async function POST(req: NextRequest) {
  const auth = await getAuthHeaders()
  if (!("authorization" in auth)) {
    return NextResponse.json(
      { error: "Your session has expired — please log in again." },
      { status: 401 }
    )
  }

  let payload: unknown
  try {
    payload = await req.json()
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 })
  }

  let res: Response
  try {
    res = await fetch(`${BACKEND_URL}/store/assistant`, {
      method: "POST",
      headers: {
        ...auth,
        "content-type": "application/json",
        "x-publishable-api-key": PUBLISHABLE_KEY,
      },
      body: JSON.stringify(payload),
      cache: "no-store",
    })
  } catch {
    return NextResponse.json(
      { error: "Couldn't reach the assistant. Try again in a moment." },
      { status: 502 }
    )
  }

  const data = (await res.json().catch(() => ({}))) as Record<string, unknown>
  return NextResponse.json(data, { status: res.status })
}
