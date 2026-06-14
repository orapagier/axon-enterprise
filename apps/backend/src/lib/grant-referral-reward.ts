import type { MedusaContainer } from "@medusajs/framework/types"
import { ContainerRegistrationKeys, Modules } from "@medusajs/framework/utils"
import { createPromotionsWorkflow } from "@medusajs/core-flows"
import { randomBytes } from "crypto"
import { REFERRAL_MODULE } from "../modules/referral"
import type ReferralModuleService from "../modules/referral/service"
import { normalizeCode } from "../modules/referral/service"
import {
  REFERRAL_BONUS_CENTAVOS,
  REFERRAL_BONUS_PHP,
} from "./referral"
import { sendEmail } from "./notify"

const PH_CURRENCY = "php"
// One customer group per referrer scopes each credit promotion to the earner,
// so a leaked code is worthless to anyone else.
const CREDIT_GROUP_PREFIX = "referral-credit:"

export type GrantOutcome =
  | { granted: false; reason: string }
  | { granted: true; referrerId: string; promoCode: string }

const promoSuffix = (): string => randomBytes(4).toString("hex").toUpperCase()

/**
 * Grant a referral bonus when a referee upgrades to premium for the first time.
 *
 * Idempotent and self-guarding: it no-ops (returning a reason) when there's no
 * referral code, the code is unknown, it's a self-referral, or this referee was
 * already recorded. The Referral row is written *first* as `pending` (claiming
 * the unique-per-referee slot), then upgraded to `rewarded` once the ₱-credit
 * promotion is issued — so a promotion hiccup leaves a retriable `pending` row
 * rather than losing the attribution.
 *
 * Callers (membership approval) run this best-effort; it must never throw in a
 * way that blocks the upgrade.
 */
export async function grantReferralReward(
  container: MedusaContainer,
  args: {
    refereeId: string
    refereeEmail: string | null | undefined
    refereeMetadata: Record<string, unknown>
  }
): Promise<GrantOutcome> {
  const logger = container.resolve(ContainerRegistrationKeys.LOGGER)
  const referral = container.resolve(REFERRAL_MODULE) as ReferralModuleService

  const codeUsed = normalizeCode(args.refereeMetadata["referred_by_code"])
  if (!codeUsed) return { granted: false, reason: "no_referral_code" }

  // One bonus per referee, ever.
  const existing = await referral.listReferrals(
    { referee_customer_id: args.refereeId },
    { take: 1 }
  )
  if (existing.length > 0) return { granted: false, reason: "already_recorded" }

  const referrerId = await referral.resolveReferrerByCode(codeUsed)
  if (!referrerId) return { granted: false, reason: "unknown_code" }
  if (referrerId === args.refereeId)
    return { granted: false, reason: "self_referral" }

  const customerModule = container.resolve(Modules.CUSTOMER)
  let referrerEmail: string | null = null
  try {
    const referrer = await customerModule.retrieveCustomer(referrerId, {
      select: ["id", "email"],
    })
    referrerEmail = referrer?.email ?? null
  } catch {
    return { granted: false, reason: "referrer_missing" }
  }

  // Claim the unique slot up front. If two approvals race, the second insert
  // hits the unique index and throws — we treat that as already-recorded.
  let referralRowId: string
  try {
    const created = await referral.createReferrals({
      referrer_customer_id: referrerId,
      referee_customer_id: args.refereeId,
      referee_email: args.refereeEmail ?? null,
      code_used: codeUsed,
      status: "pending",
      reward_amount_centavos: REFERRAL_BONUS_CENTAVOS,
    })
    referralRowId = Array.isArray(created) ? created[0].id : created.id
  } catch {
    return { granted: false, reason: "already_recorded" }
  }

  // Resolve PHP currency from the seeded region (fallback to "php").
  const regionModule = container.resolve(Modules.REGION)
  const regions = await regionModule.listRegions({})
  const currency =
    regions.find((r) => r.currency_code?.toLowerCase() === PH_CURRENCY)
      ?.currency_code ?? PH_CURRENCY

  // Per-referrer customer group (find-or-create) + ensure membership.
  const groupName = `${CREDIT_GROUP_PREFIX}${referrerId}`
  let group = (
    await customerModule.listCustomerGroups({ name: groupName }, { take: 1 })
  )?.[0]
  if (!group) {
    group = await customerModule.createCustomerGroups({
      name: groupName,
      metadata: { source: "referral-credit", referrer_id: referrerId },
    })
  }
  try {
    await customerModule.addCustomerToGroup({
      customer_id: referrerId,
      customer_group_id: group.id,
    })
  } catch {
    /* already a member — fine */
  }

  const promoCode = `RC-${promoSuffix()}`
  const { result } = await createPromotionsWorkflow(container).run({
    input: {
      promotionsData: [
        {
          code: promoCode,
          type: "standard",
          status: "active",
          // Single global use; combined with the customer-group rule that means
          // exactly one ₱-credit redemption by the referrer.
          limit: 1,
          application_method: {
            type: "fixed",
            target_type: "order",
            allocation: "across",
            value: REFERRAL_BONUS_PHP,
            currency_code: currency,
          },
          rules: [
            {
              attribute: "customer.groups.id",
              operator: "in",
              values: [group.id],
            },
          ],
        },
      ],
    },
  })
  const promo = Array.isArray(result) ? result[0] : result

  await referral.updateReferrals({
    id: referralRowId,
    status: "rewarded",
    reward_promo_id: promo?.id ?? null,
    reward_promo_code: promoCode,
    rewarded_at: new Date(),
  })

  await sendEmail(container, {
    to: referrerEmail,
    template: "referral-credit-earned",
    data: { amount_php: REFERRAL_BONUS_PHP, code: promoCode },
  })

  logger.info(
    `Referral reward granted: ${promoCode} (₱${REFERRAL_BONUS_PHP}) to ${referrerId} for referee ${args.refereeId}.`
  )
  return { granted: true, referrerId, promoCode }
}
