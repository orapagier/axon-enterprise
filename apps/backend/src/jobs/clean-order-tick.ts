/**
 * Nightly accountability recovery.
 *
 * - "warned" customers recover to "normal" (strikes reset) once BOTH hold:
 *     1. recovery_eligible_at (= strike + 6 months) has passed, and
 *     2. they placed at least one clean (delivered) order since the strike
 *        (last_clean_order_at, stamped by confirmDelivery, is after the
 *        strike moment = recovery_eligible_at − 6 months).
 *   Warned rows from before recovery_eligible_at existed are self-healed:
 *   the clock starts at the first tick that sees them.
 * - "prepay_locked_30d" customers whose state_until has passed → "normal"
 *   (strike count preserved so the next refusal triggers a stricter lock).
 * - "prepay_locked_permanent" stays as-is (admin override only).
 *
 * Run on-demand with:
 *   npx medusa exec ./src/jobs/clean-order-tick.ts
 */
import type { MedusaContainer } from "@medusajs/framework/types"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"
import {
  ACCOUNTABILITY_MODULE,
  WARNED_RECOVERY_WINDOW_MS,
} from "../modules/accountability"
import type AccountabilityModuleService from "../modules/accountability/service"

export const config = {
  name: "clean-order-tick",
  schedule: "0 2 * * *",
}


export default async function cleanOrderTick(container: MedusaContainer) {
  const logger = container.resolve(ContainerRegistrationKeys.LOGGER)
  const accountability: AccountabilityModuleService = container.resolve(
    ACCOUNTABILITY_MODULE
  )

  const now = new Date()

  const [warned, locked30] = await Promise.all([
    accountability.listBuyerAccountStatuses(
      { state: "warned" },
      { take: 500 }
    ),
    accountability.listBuyerAccountStatuses(
      { state: "prepay_locked_30d" },
      { take: 500 }
    ),
  ])

  const toDate = (v: unknown): Date | null =>
    v == null ? null : typeof v === "string" ? new Date(v) : (v as Date)

  let warnedRecovered = 0
  for (const s of warned) {
    const eligibleAt = toDate(s.recovery_eligible_at)

    // Legacy warned rows (created before recovery_eligible_at was stamped at
    // escalation time): start their clean window now.
    if (!eligibleAt) {
      await accountability.updateBuyerAccountStatuses({
        id: s.id,
        recovery_eligible_at: new Date(now.getTime() + WARNED_RECOVERY_WINDOW_MS),
      })
      continue
    }
    if (eligibleAt.getTime() > now.getTime()) continue

    // Clean order required since the strike (= eligibleAt − window).
    const last = toDate(s.last_clean_order_at)
    const strikeAtMs = eligibleAt.getTime() - WARNED_RECOVERY_WINDOW_MS
    if (!last || last.getTime() < strikeAtMs) continue

    await accountability.updateBuyerAccountStatuses({
      id: s.id,
      state: "normal",
      strike_count: 0,
      recovery_eligible_at: null,
    })
    warnedRecovered++
    logger.info(`Buyer ${s.customer_id}: warned → normal (6mo clean).`)
  }

  let lockExpired = 0
  for (const s of locked30) {
    const until =
      s.state_until == null
        ? null
        : typeof s.state_until === "string"
          ? new Date(s.state_until)
          : s.state_until
    if (until && until <= now) {
      await accountability.updateBuyerAccountStatuses({
        id: s.id,
        state: "normal",
        state_until: null,
      })
      lockExpired++
      logger.info(`Buyer ${s.customer_id}: prepay_locked_30d → normal (lock expired).`)
    }
  }

  logger.info(
    `clean-order-tick finished: ${warnedRecovered} warned recovered, ${lockExpired} 30d locks expired.`
  )
}
