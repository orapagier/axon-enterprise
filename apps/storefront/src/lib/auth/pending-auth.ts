import "server-only"

import crypto from "crypto"
import { cookies as nextCookies } from "next/headers"
import {
  getOtpSecret,
  signCookiePayload,
  verifyCookiePayload,
} from "./signed-cookie"

/**
 * Pending email-verification state shared by both signup rails.
 *
 * The email-OTP flow (`requestEmailCode`/`verifyEmailCode` server actions) and
 * the Google OAuth callback both park an unverified signup here: a short-lived
 * httpOnly cookie holding the email, a salted hash of the 6-digit code, and
 * the signup choices (role/hub) to apply once the code checks out. No account
 * exists until `verifyEmailCode` consumes this cookie — that is what makes the
 * OTP mandatory for registration regardless of which rail started it.
 */

export const PENDING_AUTH_COOKIE = "_mfh_pending_auth"
export const PENDING_AUTH_TTL_SECONDS = 10 * 60

// OTP abuse limits (per browser). A short cooldown stops rapid resends and a
// rolling window caps total sends to blunt email-bombing. IP/edge-level limits
// remain a recommended additional layer.
const OTP_THROTTLE_COOKIE = "_mfh_otp_throttle"
export const OTP_RESEND_COOLDOWN_MS = 30 * 1000
export const OTP_MAX_SENDS_PER_WINDOW = 5
export const OTP_WINDOW_MS = 15 * 60 * 1000

export type PendingAuth = {
  email: string
  codeHash: string
  mode: "signin" | "signup"
  role?: string
  hub?: string
  /** Which rail started the verification; absent means the email-OTP rail. */
  authMethod?: "email_otp" | "google"
  /** Profile names carried from the Google id_token, applied at creation. */
  firstName?: string
  lastName?: string
  /** Referral code from a `?ref=` link, stored on the new customer at signup. */
  ref?: string
  expiresAt: number
  attempts: number
}

// Keyed with the server-only secret so a code hash cannot be precomputed by a
// client (even one that forges the cookie): defence-in-depth alongside the
// signed cookie below.
export const hashCode = (code: string, email: string) =>
  crypto
    .createHmac("sha256", getOtpSecret())
    .update(`${email.toLowerCase()}:${code}`)
    .digest("hex")

export const generateCode = () =>
  // 6-digit, leading zeros preserved
  String(crypto.randomInt(0, 1_000_000)).padStart(6, "0")

export const setPendingAuth = async (data: PendingAuth) => {
  const cookies = await nextCookies()
  // Signed: the code hash lives here, so a forged cookie must not be trusted.
  cookies.set(PENDING_AUTH_COOKIE, signCookiePayload(data), {
    maxAge: PENDING_AUTH_TTL_SECONDS,
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
  })
}

export const readPendingAuth = async (): Promise<PendingAuth | null> => {
  const cookies = await nextCookies()
  const raw = cookies.get(PENDING_AUTH_COOKIE)?.value
  const parsed = verifyCookiePayload<PendingAuth>(raw)
  if (!parsed) return null
  if (Date.now() > parsed.expiresAt) return null
  return parsed
}

export const clearPendingAuth = async () => {
  const cookies = await nextCookies()
  cookies.set(PENDING_AUTH_COOKIE, "", { maxAge: -1 })
}

export type OtpThrottle = {
  windowStart: number
  count: number
  lastSentAt: number
}

export const readThrottle = async (): Promise<OtpThrottle> => {
  const cookies = await nextCookies()
  const raw = cookies.get(OTP_THROTTLE_COOKIE)?.value
  if (raw) {
    try {
      const parsed = JSON.parse(raw) as OtpThrottle
      // Keep the same window only while it's still open; otherwise reset.
      if (Date.now() - parsed.windowStart < OTP_WINDOW_MS) return parsed
    } catch {
      // fall through to a fresh window
    }
  }
  return { windowStart: Date.now(), count: 0, lastSentAt: 0 }
}

export const writeThrottle = async (t: OtpThrottle) => {
  const cookies = await nextCookies()
  cookies.set(OTP_THROTTLE_COOKIE, JSON.stringify(t), {
    maxAge: Math.ceil(OTP_WINDOW_MS / 1000),
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
  })
}
