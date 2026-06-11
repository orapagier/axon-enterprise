import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { createHmac, timingSafeEqual } from "crypto"

/**
 * Minimal self-contained rider auth.
 *
 * Riders aren't Medusa "customer"/"user" actors, so rather than register a
 * custom actor type + auth provider we issue our own signed token (HS256 over
 * the project's JWT_SECRET) at POST /rider/auth/login and verify it on /rider/*.
 * No external dependency — node's crypto is enough for a stateless HMAC token.
 */

const TTL_SECONDS = 30 * 24 * 60 * 60 // 30 days

export type RiderTokenPayload = {
  rider_id: string
  hub_id: string
  actor_type: "rider"
  iat: number
  exp: number
}

function getSecret(): string {
  return process.env.JWT_SECRET || "supersecret-dev-only"
}

function b64url(input: string): string {
  return Buffer.from(input).toString("base64url")
}

function sign(data: string): string {
  return createHmac("sha256", getSecret()).update(data).digest("base64url")
}

export function signRiderToken(p: { rider_id: string; hub_id: string }): string {
  const now = Math.floor(Date.now() / 1000)
  const head = b64url(JSON.stringify({ alg: "HS256", typ: "JWT" }))
  const body = b64url(
    JSON.stringify({
      rider_id: p.rider_id,
      hub_id: p.hub_id,
      actor_type: "rider",
      iat: now,
      exp: now + TTL_SECONDS,
    })
  )
  return `${head}.${body}.${sign(`${head}.${body}`)}`
}

export function verifyRiderToken(token: string): RiderTokenPayload | null {
  const parts = token.split(".")
  if (parts.length !== 3) return null
  const [head, body, sig] = parts

  const expected = sign(`${head}.${body}`)
  const a = Buffer.from(sig)
  const b = Buffer.from(expected)
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null

  let payload: RiderTokenPayload
  try {
    payload = JSON.parse(
      Buffer.from(body, "base64url").toString("utf8")
    ) as RiderTokenPayload
  } catch {
    return null
  }

  if (payload.actor_type !== "rider" || !payload.rider_id) return null
  if (
    typeof payload.exp !== "number" ||
    payload.exp < Math.floor(Date.now() / 1000)
  ) {
    return null
  }
  return payload
}

/** Read the rider id attached by the authenticateRider middleware. */
export function getRiderId(req: MedusaRequest): string | null {
  return (req as unknown as { rider_id?: string }).rider_id ?? null
}

/** The token-issuing routes under /rider/auth/* — the only public ones. */
const PUBLIC_RIDER_PATHS = [
  "/rider/auth/login",
  "/rider/auth/google/start",
  "/rider/auth/google/callback",
]

/** Express-style middleware guarding the /rider/* routes (except /rider/auth/*). */
export function authenticateRider(
  req: MedusaRequest,
  res: MedusaResponse,
  next: () => void
) {
  // The /rider/auth/* entry points are public — they issue the token. Medusa
  // applies all matching middleware entries cumulatively (a more-specific
  // matcher does NOT override a broader one), so the broad /rider/* guard also
  // runs on these paths. Exempt them here rather than rely on matcher
  // precedence that doesn't exist.
  if (PUBLIC_RIDER_PATHS.some((p) => req.path.endsWith(p))) {
    next()
    return
  }

  const header = req.headers.authorization
  const token = header?.startsWith("Bearer ") ? header.slice(7) : null
  const payload = token ? verifyRiderToken(token) : null
  if (!payload) {
    res.status(401).json({ error: "Missing or invalid rider token" })
    return
  }
  const r = req as unknown as { rider_id?: string; rider_hub_id?: string }
  r.rider_id = payload.rider_id
  r.rider_hub_id = payload.hub_id
  next()
}
