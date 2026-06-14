import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { Modules } from "@medusajs/framework/utils"
import { REFERRAL_MODULE } from "../../../../modules/referral"
import type ReferralModuleService from "../../../../modules/referral/service"
import { REFERRAL_BONUS_PHP } from "../../../../lib/referral"

/**
 * GET /store/referrals/me — the signed-in customer's referral panel data.
 *
 * Returns their own sharable code (created lazily on first view), the people
 * they've referred (with masked emails + status), and the ₱-credit codes they've
 * earned. "used" comes straight from the promotion's completed-order usage, so
 * the storefront can show an accurate available balance.
 */

const maskEmail = (email: string | null | undefined): string => {
  if (!email) return "a friend"
  const [local, domain] = email.split("@")
  if (!domain) return "a friend"
  const head = local.slice(0, 1)
  return `${head}${"*".repeat(Math.max(local.length - 1, 1))}@${domain}`
}

export async function GET(req: MedusaRequest, res: MedusaResponse) {
  const customerId =
    (req as unknown as { auth_context?: { actor_id?: string } }).auth_context
      ?.actor_id ?? null
  if (!customerId) {
    res.status(401).json({ error: "Not authenticated" })
    return
  }

  const referral = req.scope.resolve(REFERRAL_MODULE) as ReferralModuleService
  const code = await referral.getOrCreateCodeFor(customerId)

  const referrals = await referral.listReferrals(
    { referrer_customer_id: customerId },
    { order: { created_at: "DESC" }, take: 100 }
  )

  // Pull usage for the earned credit promotions in one query.
  const promoIds = referrals
    .map((r) => r.reward_promo_id)
    .filter((id): id is string => typeof id === "string" && id.length > 0)
  const usageById = new Map<string, number>()
  if (promoIds.length > 0) {
    try {
      const promotionModule = req.scope.resolve(Modules.PROMOTION)
      const promos = await promotionModule.listPromotions(
        { id: promoIds },
        { select: ["id", "used"], take: promoIds.length }
      )
      for (const p of promos) {
        usageById.set(p.id, Number((p as { used?: number }).used ?? 0))
      }
    } catch {
      /* usage lookup failed — treat all as unused below */
    }
  }

  const credits = referrals
    .filter((r) => r.status === "rewarded" && r.reward_promo_code)
    .map((r) => ({
      code: r.reward_promo_code as string,
      amount: REFERRAL_BONUS_PHP,
      used: (r.reward_promo_id && usageById.get(r.reward_promo_id)) ? true : false,
    }))

  const balance = credits
    .filter((c) => !c.used)
    .reduce((sum, c) => sum + c.amount, 0)

  res.json({
    code,
    bonus_php: REFERRAL_BONUS_PHP,
    referrals: referrals.map((r) => ({
      referee: maskEmail(r.referee_email),
      status: r.status,
      created_at: r.created_at,
    })),
    credits,
    balance,
  })
}
