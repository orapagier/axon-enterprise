import "server-only"
import crypto from "crypto"

/**
 * Tamper-evident cookie payloads.
 *
 * `httpOnly` stops client JS from reading a cookie, but it does NOT stop the
 * browser's owner from crafting an arbitrary value (devtools / an intercepting
 * proxy). So any cookie whose contents the server later *trusts* — the pending
 * email-verification state, the Google OAuth CSRF payload — must be signed with
 * a server-only secret and rejected on any mismatch. Otherwise a user can forge
 * the cookie and, e.g., mark an OTP as already verified for someone else's
 * email (account takeover).
 *
 * Format: `base64url(json).base64url(hmac_sha256(base64url(json)))`. base64url
 * never contains a "." so the signature splits cleanly on the last one.
 */

export const getOtpSecret = (): string => {
  const secret = process.env.MFH_OTP_SECRET
  if (!secret) {
    throw new Error("MFH_OTP_SECRET is not configured")
  }
  return secret
}

export const signCookiePayload = (payload: unknown): string => {
  const body = Buffer.from(JSON.stringify(payload), "utf8").toString("base64url")
  const mac = crypto
    .createHmac("sha256", getOtpSecret())
    .update(body)
    .digest("base64url")
  return `${body}.${mac}`
}

export const verifyCookiePayload = <T>(raw: string | undefined | null): T | null => {
  if (!raw) return null
  const dot = raw.lastIndexOf(".")
  if (dot <= 0) return null
  const body = raw.slice(0, dot)
  const mac = raw.slice(dot + 1)

  const expected = crypto
    .createHmac("sha256", getOtpSecret())
    .update(body)
    .digest("base64url")
  const a = new Uint8Array(Buffer.from(mac))
  const b = new Uint8Array(Buffer.from(expected))
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return null

  try {
    return JSON.parse(Buffer.from(body, "base64url").toString("utf8")) as T
  } catch {
    return null
  }
}
