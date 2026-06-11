import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { RIDER_MODULE } from "../../../../../modules/rider"
import type RiderModuleService from "../../../../../modules/rider/service"
import { signRiderToken, signSignupTicket } from "../../../../../lib/rider-auth"
import {
  exchangeCodeForClaims,
  readCookie,
  RIDER_GAUTH_COOKIE,
  RIDER_GAUTH_COOKIE_PATH,
  type RiderGoogleAuthPending,
} from "../../../../../lib/google-oauth"

/**
 * GET /rider/auth/google/callback — finishes the Google sign-in for the rider
 * PWA (public; exempted inside authenticateRider). Validates the state nonce,
 * swaps the code for the verified Google email and matches it against
 * rider.email. A match redirects back to /rider-app with the same 30-day
 * rider token POST /rider/auth/login issues; an unknown email redirects with
 * a short-lived signup ticket instead, which the app's registration form
 * sends to POST /rider/auth/signup. Everything travels in the URL fragment
 * so it never reaches server logs; the app strips it immediately.
 */
export async function GET(req: MedusaRequest, res: MedusaResponse) {
  const finish = (fragment: string) => {
    res.clearCookie(RIDER_GAUTH_COOKIE, { path: RIDER_GAUTH_COOKIE_PATH })
    res.redirect(`/rider-app#${fragment}`)
  }
  const fail = (code: string) => finish(`gerror=${code}`)

  let pending: RiderGoogleAuthPending | null = null
  try {
    const raw = readCookie(req, RIDER_GAUTH_COOKIE)
    pending = raw ? (JSON.parse(raw) as RiderGoogleAuthPending) : null
  } catch {
    pending = null
  }

  if (req.query.error) {
    // Rider cancelled on Google's consent screen.
    fail("denied")
    return
  }

  const code = typeof req.query.code === "string" ? req.query.code : null
  const state = typeof req.query.state === "string" ? req.query.state : null
  if (!pending || !code || !state || state !== pending.state) {
    fail("state")
    return
  }

  const claims = await exchangeCodeForClaims(code, pending.redirectUri)
  if (!claims) {
    fail("auth_failed")
    return
  }
  if (!claims.email || claims.email_verified !== true) {
    fail("unverified_email")
    return
  }
  const email = claims.email.toLowerCase()

  const riders: RiderModuleService = req.scope.resolve(RIDER_MODULE)
  const [rider] = await riders.listRiders({ email }, { take: 1 })
  if (!rider) {
    // No rider carries this email — send the verified email back as a signup
    // ticket so the app can open the registration form prefilled with it.
    const ticket = signSignupTicket(email)
    finish(
      `gsignup=${encodeURIComponent(ticket)}&gemail=${encodeURIComponent(email)}`
    )
    return
  }
  if (rider.status !== "active") {
    fail(`rider_${rider.status}`)
    return
  }

  const token = signRiderToken({ rider_id: rider.id, hub_id: rider.hub_id })
  finish(`rt=${encodeURIComponent(token)}`)
}
