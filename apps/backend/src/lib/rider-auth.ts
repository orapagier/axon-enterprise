import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { createHmac, timingSafeEqual } from "crypto"
import { RIDER_MODULE } from "../modules/rider"
import type RiderModuleService from "../modules/rider/service"

/**
 * Minimal self-contained rider auth.
 *
 * Riders aren't Medusa "customer"/"user" actors, so rather than register a
 * custom actor type + auth provider we issue our own signed token (HS256 over
 * the project's JWT_SECRET) and verify it on /rider/*. The token is minted at
 * GET /store/riders/session — riders sign in on the storefront like any
 * customer (OTP / Google), and that route exchanges the customer session for a
 * rider token (matched on customer.email ↔ rider.email). No external
 * dependency — node's crypto is enough for a stateless HMAC token.
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
  const secret = process.env.JWT_SECRET
  // Mirror medusa-config's requireSecret: never sign/verify rider tokens with a
  // guessable secret in production (that would let anyone forge a rider token).
  if (!secret || secret === "supersecret") {
    if (process.env.NODE_ENV === "production") {
      throw new Error(
        "JWT_SECRET must be set to a strong, unique value in production " +
          "(rider tokens are signed with it)."
      )
    }
    return secret || "supersecret-dev-only"
  }
  return secret
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

/**
 * Express-style middleware guarding the /rider/* routes. Every /rider/* route
 * now requires a valid rider token — the token is issued elsewhere (GET
 * /store/riders/session, behind customer auth), so there are no public,
 * token-issuing /rider/* entry points to exempt anymore (the legacy rider PWA
 * with its /rider/auth/* login/signup/Google routes was retired).
 */
export function authenticateRider(
  req: MedusaRequest,
  res: MedusaResponse,
  next: () => void
) {
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
