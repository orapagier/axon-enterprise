import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import crypto from "crypto"
import {
  RIDER_GAUTH_COOKIE,
  RIDER_GAUTH_COOKIE_PATH,
  RIDER_GAUTH_TTL_SECONDS,
} from "../../../../../lib/google-oauth"

/**
 * GET /rider/auth/google/start — kicks off the Google OAuth code flow for the
 * rider PWA (public; exempted inside authenticateRider). The CSRF state nonce
 * and the exact redirect URI ride along in a short-lived httpOnly cookie so
 * the callback can validate the response and finish the token exchange.
 *
 * The callback signs in riders whose rider.email matches the Google account;
 * an unknown verified email gets a signup ticket so the rider can register
 * (landing as "pending" until the hub admin approves them).
 */
export async function GET(req: MedusaRequest, res: MedusaResponse) {
  const fail = (code: string) => res.redirect(`/rider-app#gerror=${code}`)

  const clientId = process.env.GOOGLE_CLIENT_ID
  if (!clientId || !process.env.GOOGLE_CLIENT_SECRET) {
    fail("not_configured")
    return
  }

  const state = crypto.randomBytes(16).toString("hex")
  const redirectUri =
    process.env.GOOGLE_RIDER_REDIRECT_URI ??
    `${req.protocol}://${req.get("host")}/rider/auth/google/callback`

  const authorizeUrl = new URL("https://accounts.google.com/o/oauth2/v2/auth")
  authorizeUrl.searchParams.set("client_id", clientId)
  authorizeUrl.searchParams.set("redirect_uri", redirectUri)
  authorizeUrl.searchParams.set("response_type", "code")
  authorizeUrl.searchParams.set("scope", "openid email")
  authorizeUrl.searchParams.set("state", state)
  authorizeUrl.searchParams.set("prompt", "select_account")

  res.cookie(RIDER_GAUTH_COOKIE, JSON.stringify({ state, redirectUri }), {
    maxAge: RIDER_GAUTH_TTL_SECONDS * 1000,
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: RIDER_GAUTH_COOKIE_PATH,
  })
  res.redirect(authorizeUrl.toString())
}
