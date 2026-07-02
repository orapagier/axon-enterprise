import { NextRequest, NextResponse } from "next/server"
import crypto from "crypto"
import { GAUTH_COOKIE, GAUTH_TTL_SECONDS } from "@lib/auth/google-oauth"
import { signCookiePayload } from "@lib/auth/signed-cookie"

const VALID_ROLES = ["consumer", "producer", "trader", "rider"]

/**
 * Kicks off the Google OAuth code flow. The chosen mode/role/hub ride along
 * in a short-lived httpOnly cookie (with a CSRF `state` nonce) so the
 * callback can finish signup with the right account type and default hub.
 *
 * Lives under /api so the storefront's country-prefix middleware leaves the
 * OAuth redirect URIs alone.
 */
export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams
  // Behind a proxy/tunnel the request origin is the local bind address
  // (e.g. localhost:8000), so prefer the configured public base URL.
  const origin = process.env.NEXT_PUBLIC_BASE_URL || request.nextUrl.origin
  const rawCountry = String(params.get("countryCode") ?? "ph").toLowerCase()
  const countryCode = /^[a-z]{2}$/.test(rawCountry) ? rawCountry : "ph"
  const accountUrl = new URL(`/${countryCode}/account`, origin)

  const fail = (code: string) => {
    accountUrl.searchParams.set("gerror", code)
    return NextResponse.redirect(accountUrl)
  }

  const clientId = process.env.GOOGLE_CLIENT_ID
  if (!clientId || !process.env.GOOGLE_CLIENT_SECRET) {
    return fail("not_configured")
  }

  const mode = params.get("mode") === "signup" ? "signup" : "signin"
  const role = String(params.get("role") ?? "")
  const hub = String(params.get("hub") ?? "").trim().slice(0, 64)
  const ref =
    mode === "signup"
      ? String(params.get("ref") ?? "").trim().toUpperCase().slice(0, 16) ||
        undefined
      : undefined

  if (mode === "signup" && !VALID_ROLES.includes(role)) {
    return fail("missing_role")
  }

  const state = crypto.randomBytes(16).toString("hex")
  const redirectUri =
    process.env.GOOGLE_REDIRECT_URI ??
    new URL("/api/auth/google/callback", origin).toString()

  const authorizeUrl = new URL("https://accounts.google.com/o/oauth2/v2/auth")
  authorizeUrl.searchParams.set("client_id", clientId)
  authorizeUrl.searchParams.set("redirect_uri", redirectUri)
  authorizeUrl.searchParams.set("response_type", "code")
  authorizeUrl.searchParams.set("scope", "openid email profile")
  authorizeUrl.searchParams.set("state", state)
  authorizeUrl.searchParams.set("prompt", "select_account")

  const response = NextResponse.redirect(authorizeUrl)
  response.cookies.set(
    GAUTH_COOKIE,
    JSON.stringify({ state, mode, role, hub, ref, countryCode, redirectUri }),
    {
      maxAge: GAUTH_TTL_SECONDS,
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
    }
  )
  return response
}
