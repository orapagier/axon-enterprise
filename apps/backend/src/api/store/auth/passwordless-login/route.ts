import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { Modules } from "@medusajs/framework/utils"
import crypto from "crypto"

/**
 * Storefront-only: returns the derived secret for a customer whose
 * email was just OTP-verified on the storefront. The storefront then
 * uses that secret with Medusa's `emailpass` provider to mint a session.
 *
 * Auth is HMAC-based: the storefront signs `${email}:${timestamp}` with
 * a shared secret (MFH_OTP_SECRET). The route rejects:
 *   - missing/invalid signature
 *   - timestamps older than 30s (replay protection)
 *   - customers without a derived secret (i.e. created the legacy way)
 */
export async function POST(req: MedusaRequest, res: MedusaResponse) {
  const sharedSecret = process.env.MFH_OTP_SECRET
  if (!sharedSecret) {
    res.status(500).json({ error: "OTP secret not configured" })
    return
  }

  const { email, signature, timestamp } = (req.body ?? {}) as {
    email?: string
    signature?: string
    timestamp?: number
  }

  if (!email || !signature || !timestamp) {
    res.status(400).json({ error: "Missing required fields" })
    return
  }

  const now = Date.now()
  if (Math.abs(now - timestamp) > 30_000) {
    res.status(400).json({ error: "Request expired" })
    return
  }

  const expected = crypto
    .createHmac("sha256", sharedSecret)
    .update(`${email.toLowerCase()}:${timestamp}`)
    .digest("hex")

  if (
    expected.length !== signature.length ||
    !crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(signature))
  ) {
    res.status(401).json({ error: "Invalid signature" })
    return
  }

  const customerModule = req.scope.resolve(Modules.CUSTOMER)
  const [customer] = await customerModule.listCustomers(
    { email: email.toLowerCase() },
    { take: 1 }
  )

  if (!customer) {
    res.status(404).json({ error: "No account with that email" })
    return
  }

  const derivedSecret =
    (customer.metadata?._derived_secret as string | undefined) ?? null

  if (!derivedSecret) {
    res.status(409).json({
      error:
        "This account predates passwordless sign-in. Please use your password.",
    })
    return
  }

  res.json({ derivedSecret })
}
