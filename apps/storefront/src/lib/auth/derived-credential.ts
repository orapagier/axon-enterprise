import "server-only"
import crypto from "crypto"

/**
 * Deterministic per-customer credential used internally with Medusa's
 * emailpass provider. Derived from the email + a server-only shared secret so
 * it is reproducible at both sign-up and sign-in — which means we never store
 * it anywhere (Medusa persists only its own salted hash). The customer never
 * sees or types it.
 *
 * Shared by every passwordless rail (email OTP, Google OAuth): all of them
 * prove ownership of the email first, then mint a session with this same
 * credential, so one customer account works across rails.
 *
 * NOTE: rotating MFH_OTP_SECRET invalidates every derived credential and would
 * force all customers to re-register. Treat it as long-lived.
 */
export const deriveCustomerSecret = (email: string): string => {
  const secret = process.env.MFH_OTP_SECRET
  if (!secret) {
    throw new Error("MFH_OTP_SECRET is not configured")
  }
  return crypto
    .createHmac("sha256", secret)
    .update(`mfh-pwd:v1:${email.toLowerCase()}`)
    .digest("hex")
}
