/**
 * Runtime verification for the referral bonus, against the LIVE database.
 *
 * The pure guard logic is unit-tested (grant-referral-reward.unit.spec.ts) with
 * a mocked container. This script proves what a unit test can't:
 *   1. the referral module migration is actually applied — codes + referral rows
 *      round-trip through Postgres;
 *   2. the REAL createPromotionsWorkflow issues a ₱50 fixed order-level credit,
 *      scoped to a per-referrer customer group;
 *   3. idempotency holds against the real unique index (one bonus per referee);
 *   4. self-referral is blocked.
 *
 * It creates throwaway customers (tagged), runs the real grant, asserts, then
 * deletes everything it created (customers, referral rows + codes, the credit
 * promotion, and the per-referrer group). Safe to run repeatedly.
 *
 * Run with:
 *   npx medusa exec ./src/migration-scripts/verify-referral.ts
 */
import { ExecArgs } from "@medusajs/framework/types"
import { ContainerRegistrationKeys, Modules } from "@medusajs/framework/utils"
import { REFERRAL_MODULE } from "../modules/referral"
import type ReferralModuleService from "../modules/referral/service"
import { grantReferralReward } from "../lib/grant-referral-reward"
import { REFERRAL_BONUS_PHP } from "../lib/referral"

export default async function verifyReferral({ container }: ExecArgs) {
  const logger = container.resolve(ContainerRegistrationKeys.LOGGER)
  const referral = container.resolve(REFERRAL_MODULE) as ReferralModuleService
  const customerModule = container.resolve(Modules.CUSTOMER)
  const promotionModule = container.resolve(Modules.PROMOTION)

  const TAG = `verifyRef-${Date.now()}`
  const customerIds: string[] = []
  const promoIds: string[] = []
  const groupIds: string[] = []

  let pass = 0
  let fail = 0
  const check = (name: string, ok: boolean, detail = "") => {
    if (ok) {
      pass++
      logger.info(`  ✅ ${name}`)
    } else {
      fail++
      logger.error(`  ❌ ${name} ${detail}`)
    }
  }

  const mkCustomer = async (label: string) => {
    const c = await customerModule.createCustomers({
      email: `${TAG}-${label}@example.com`.toLowerCase(),
      first_name: label,
      metadata: { source: TAG },
    })
    customerIds.push(c.id)
    return c
  }

  try {
    const referrer = await mkCustomer("referrer")
    const referee = await mkCustomer("referee")

    // ── 1. code allocation round-trips ──────────────────────────────────────
    const code = await referral.getOrCreateCodeFor(referrer.id)
    check("referral code allocated (migration applied)", !!code, `code=${code}`)
    const codeAgain = await referral.getOrCreateCodeFor(referrer.id)
    check("getOrCreateCodeFor is idempotent", code === codeAgain)
    check(
      "resolveReferrerByCode round-trips",
      (await referral.resolveReferrerByCode(code)) === referrer.id
    )

    // ── 2. happy-path grant issues a ₱50 group-scoped credit ────────────────
    const out = await grantReferralReward(container, {
      refereeId: referee.id,
      refereeEmail: referee.email,
      refereeMetadata: { referred_by_code: code },
    })
    check("grant returns granted", out.granted === true, JSON.stringify(out))
    const promoCode = out.granted ? out.promoCode : ""

    const [row] = await referral.listReferrals(
      { referee_customer_id: referee.id },
      { take: 1 }
    )
    check(
      "referral row persisted as rewarded",
      row?.status === "rewarded" &&
        row?.referrer_customer_id === referrer.id,
      JSON.stringify(row)
    )
    if (row?.reward_promo_id) promoIds.push(row.reward_promo_id)

    const [promo] = await promotionModule.listPromotions(
      { code: promoCode },
      { take: 1, relations: ["application_method", "rules", "rules.values"] }
    )
    check("credit promotion exists", !!promo, `code=${promoCode}`)
    check(
      "promotion is single-use",
      Number((promo as { limit?: number })?.limit) === 1,
      `limit=${(promo as { limit?: number })?.limit}`
    )
    const am = (promo as { application_method?: any })?.application_method
    check(
      `promotion is ₱${REFERRAL_BONUS_PHP} fixed off the order`,
      am?.type === "fixed" &&
        am?.target_type === "order" &&
        Number(am?.value) === REFERRAL_BONUS_PHP,
      JSON.stringify(am)
    )
    const rule = (promo as { rules?: any[] })?.rules?.[0]
    check(
      "promotion is scoped by customer group",
      rule?.attribute === "customer.groups.id",
      JSON.stringify(rule)
    )

    // Track the per-referrer group for cleanup + assert the referrer is in it.
    const groups = await customerModule.listCustomerGroups(
      { name: `referral-credit:${referrer.id}` },
      { take: 1 }
    )
    if (groups[0]?.id) groupIds.push(groups[0].id)
    check("per-referrer credit group created", !!groups[0]?.id)

    // ── 3. idempotency: a second grant for the same referee no-ops ───────────
    const second = await grantReferralReward(container, {
      refereeId: referee.id,
      refereeEmail: referee.email,
      refereeMetadata: { referred_by_code: code },
    })
    check(
      "second grant is blocked (one bonus per referee)",
      second.granted === false &&
        (second as { reason: string }).reason === "already_recorded",
      JSON.stringify(second)
    )
    const allForReferee = await referral.listReferrals(
      { referee_customer_id: referee.id },
      { take: 10 }
    )
    check(
      "still exactly one referral row for the referee",
      allForReferee.length === 1,
      `count=${allForReferee.length}`
    )

    // ── 4. self-referral is blocked ─────────────────────────────────────────
    const selfish = await mkCustomer("selfish")
    const selfCode = await referral.getOrCreateCodeFor(selfish.id)
    const selfOut = await grantReferralReward(container, {
      refereeId: selfish.id,
      refereeEmail: selfish.email,
      refereeMetadata: { referred_by_code: selfCode },
    })
    check(
      "self-referral blocked",
      selfOut.granted === false &&
        (selfOut as { reason: string }).reason === "self_referral",
      JSON.stringify(selfOut)
    )
  } finally {
    // ── Cleanup ─────────────────────────────────────────────────────────────
    for (const id of promoIds) {
      try {
        await promotionModule.deletePromotions(id)
      } catch {
        /* ignore */
      }
    }
    for (const cid of customerIds) {
      try {
        const codes = await referral.listReferralCodes(
          { customer_id: cid },
          { take: 10 }
        )
        for (const c of codes) await referral.deleteReferralCodes(c.id)
        const asReferrer = await referral.listReferrals(
          { referrer_customer_id: cid },
          { take: 50 }
        )
        const asReferee = await referral.listReferrals(
          { referee_customer_id: cid },
          { take: 50 }
        )
        for (const r of [...asReferrer, ...asReferee])
          await referral.deleteReferrals(r.id)
      } catch {
        /* ignore */
      }
    }
    for (const gid of groupIds) {
      try {
        await customerModule.deleteCustomerGroups(gid)
      } catch {
        /* ignore */
      }
    }
    for (const cid of customerIds) {
      try {
        await customerModule.deleteCustomers(cid)
      } catch {
        /* ignore */
      }
    }
    logger.info(
      `Cleanup: removed ${customerIds.length} customers, ${promoIds.length} promotions, ${groupIds.length} groups.`
    )
  }

  logger.info(`Referral verification: ${pass} passed, ${fail} failed.`)
  if (fail > 0) {
    throw new Error(`Referral verification FAILED (${fail} failing checks).`)
  }
}
