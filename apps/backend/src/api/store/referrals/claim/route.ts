import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { Modules } from "@medusajs/framework/utils"
import { REFERRAL_MODULE } from "../../../../modules/referral"
import type ReferralModuleService from "../../../../modules/referral/service"
import { normalizeCode } from "../../../../modules/referral/service"

/**
 * POST /store/referrals/claim  { code }
 *
 * Attaches a referrer to the signed-in customer after signup (used by the
 * upgrade form, and as a fallback for users who didn't arrive via a `?ref` link).
 * Writes `referred_by_code` to the customer's metadata; the actual ₱-credit is
 * granted later, only when this customer's FIRST premium upgrade is approved.
 *
 * Rejects: missing/unknown code, self-referral, an already-attributed customer
 * (first attribution wins), and customers who are already Hub Members (the
 * bonus rewards converting a new upgrade, not existing members).
 */
export async function POST(req: MedusaRequest, res: MedusaResponse) {
  const customerId =
    (req as unknown as { auth_context?: { actor_id?: string } }).auth_context
      ?.actor_id ?? null
  if (!customerId) {
    res.status(401).json({ error: "Not authenticated" })
    return
  }

  const code = normalizeCode((req.body as { code?: string } | undefined)?.code)
  if (!code) {
    res.status(400).json({ error: "Enter a referral code." })
    return
  }

  const customerModule = req.scope.resolve(Modules.CUSTOMER)
  const customer = await customerModule.retrieveCustomer(customerId, {
    select: ["id", "metadata"],
  })
  const meta = (customer?.metadata as Record<string, unknown> | null) ?? {}

  const status = meta.membership_status
  if (status === "active" || status === "grace") {
    res
      .status(409)
      .json({ error: "You're already a Hub Member — referral codes apply to new upgrades." })
    return
  }

  const existingCode =
    typeof meta.referred_by_code === "string" ? meta.referred_by_code : ""
  if (existingCode && existingCode !== code) {
    res
      .status(409)
      .json({ error: "A referral code is already attached to your account." })
    return
  }

  const referral = req.scope.resolve(REFERRAL_MODULE) as ReferralModuleService
  const referrerId = await referral.resolveReferrerByCode(code)
  if (!referrerId) {
    res.status(404).json({ error: "That referral code isn't valid." })
    return
  }
  if (referrerId === customerId) {
    res.status(400).json({ error: "You can't refer yourself." })
    return
  }

  await customerModule.updateCustomers(customerId, {
    metadata: {
      ...meta,
      referred_by_code: code,
      referred_by_customer_id: referrerId,
    },
  })

  res.json({ ok: true, code })
}
