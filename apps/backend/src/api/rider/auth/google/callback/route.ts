import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { RIDER_MODULE } from "../../../../../modules/rider"
import type RiderModuleService from "../../../../../modules/rider/service"
import { signRiderToken } from "../../../../../lib/rider-auth"
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
 * swaps the code for the verified Google email, matches it against the
 * admin-registered rider.email and redirects back to /rider-app with the same
 * 30-day rider token POST /rider/auth/login issues. The token travels in the
 * URL fragment so it never reaches server logs; the app stores it and strips
 * the fragment immediately.
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
    // No rider carries this email — same code whether the email is unknown
    // or belongs to a customer; riders are registered by the hub admin.
    fail("no_rider")
    return
  }
  if (rider.status !== "active") {
    fail(`rider_${rider.status}`)
    return
  }

  const token = signRiderToken({ rider_id: rider.id, hub_id: rider.hub_id })
  finish(`rt=${encodeURIComponent(token)}`)
}
