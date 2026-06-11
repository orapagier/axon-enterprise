import type { MedusaRequest } from "@medusajs/framework/http"

/**
 * Backend half of the rider-app Google sign-in (see /rider/auth/google/*).
 *
 * Mirrors the storefront's Google code flow (apps/storefront/src/lib/auth/
 * google-oauth.ts) but lands on the backend so the same-origin rider PWA can
 * use it: the start route stashes a state nonce + redirect URI in a
 * short-lived httpOnly cookie, the callback validates state, swaps the code
 * for the verified Google email and matches it against rider.email.
 *
 * Uses the same GOOGLE_CLIENT_ID / GOOGLE_CLIENT_SECRET as the storefront —
 * the backend callback URL (<backend origin>/rider/auth/google/callback) must
 * be added as an authorized redirect URI on that OAuth client.
 */

export const RIDER_GAUTH_COOKIE = "_mfh_rider_gauth"
export const RIDER_GAUTH_TTL_SECONDS = 10 * 60
/** Cookie path that covers the callback route but nothing else. */
export const RIDER_GAUTH_COOKIE_PATH = "/rider/auth/google"

export type RiderGoogleAuthPending = {
  state: string
  redirectUri: string
}

export type GoogleIdTokenClaims = {
  email?: string
  email_verified?: boolean
  sub?: string
}

/** Read one cookie off the raw header — Medusa doesn't run cookie-parser here. */
export function readCookie(req: MedusaRequest, name: string): string | null {
  const header = req.headers.cookie
  if (!header) return null
  for (const part of header.split(";")) {
    const eq = part.indexOf("=")
    if (eq === -1) continue
    if (part.slice(0, eq).trim() === name) {
      try {
        return decodeURIComponent(part.slice(eq + 1).trim())
      } catch {
        return null
      }
    }
  }
  return null
}

/**
 * Exchanges an authorization code for tokens and returns the id_token claims.
 * The id_token comes straight from Google's token endpoint over TLS, so its
 * payload is trusted without re-verifying the signature.
 */
export async function exchangeCodeForClaims(
  code: string,
  redirectUri: string
): Promise<GoogleIdTokenClaims | null> {
  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code,
      client_id: process.env.GOOGLE_CLIENT_ID ?? "",
      client_secret: process.env.GOOGLE_CLIENT_SECRET ?? "",
      redirect_uri: redirectUri,
      grant_type: "authorization_code",
    }),
  })

  if (!res.ok) return null

  const { id_token: idToken } = (await res.json()) as { id_token?: string }
  if (!idToken) return null

  try {
    const payload = idToken.split(".")[1]
    return JSON.parse(
      Buffer.from(payload, "base64url").toString("utf8")
    ) as GoogleIdTokenClaims
  } catch {
    return null
  }
}
