import { NextRequest, NextResponse } from "next/server"
import crypto from "crypto"

export const GAUTH_COOKIE = "_mfh_gauth"
const GAUTH_TTL_SECONDS = 10 * 60

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
  const rawCountry = String(params.get("countryCode") ?? "ph").toLowerCase()
  const countryCode = /^[a-z]{2}$/.test(rawCountry) ? rawCountry : "ph"
  const accountUrl = new URL(`/${countryCode}/account`, request.nextUrl.origin)

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

  if (mode === "signup" && !VALID_ROLES.includes(role)) {
    return fail("missing_role")
  }

  const state = crypto.randomBytes(16).toString("hex")
  const redirectUri =
    process.env.GOOGLE_REDIRECT_URI ??
    new URL("/api/auth/google/callback", request.nextUrl.origin).toString()

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
    JSON.stringify({ state, mode, role, hub, countryCode, redirectUri }),
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
