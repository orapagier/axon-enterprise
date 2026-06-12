import { NextRequest, NextResponse } from "next/server"

import { getAuthHeaders } from "@lib/data/cookies"

/**
 * POST /api/seller/upload
 *
 * Relays a multipart photo upload from the browser to the Medusa backend's
 * /store/seller/uploads endpoint, attaching the customer's bearer token from
 * the httpOnly cookie so it never reaches client JS.
 *
 * This is a route handler (not a server action) on purpose: server actions
 * enforce a body size limit and strict origin checks on their POSTs, and when
 * either rejects the request the browser surfaces a bare "Failed to fetch".
 * Route handlers accept the multipart body without those restrictions.
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

  let formData: FormData
  try {
    formData = await req.formData()
  } catch {
    return NextResponse.json(
      { error: "Invalid upload request." },
      { status: 400 }
    )
  }

  let res: Response
  try {
    // Don't set Content-Type — fetch derives the multipart boundary from the
    // FormData body.
    res = await fetch(`${BACKEND_URL}/store/seller/uploads`, {
      method: "POST",
      headers: {
        ...auth,
        "x-publishable-api-key": PUBLISHABLE_KEY,
      },
      body: formData,
      cache: "no-store",
    })
  } catch {
    return NextResponse.json(
      { error: "Couldn't reach the server. Try again in a moment." },
      { status: 502 }
    )
  }

  const data = (await res.json().catch(() => ({}))) as Record<string, unknown>
  return NextResponse.json(data, { status: res.status })
}
