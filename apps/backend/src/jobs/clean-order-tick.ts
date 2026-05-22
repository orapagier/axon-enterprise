/**
 * Nightly accountability recovery.
 *
 * - "warned" customers whose last_clean_order_at was 6+ months ago → reset to
 *   "normal" with strike_count 0.
 * - "prepay_locked_30d" customers whose state_until has passed → "normal"
 *   (strike count preserved so the next refusal triggers a stricter lock).
 * - "prepay_locked_permanent" stays as-is (admin override only).
 *
 * Run on-demand with:
 *   npx medusa exec ./src/jobs/clean-order-tick.ts
 */
import type { MedusaContainer } from "@medusajs/framework/types"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"
import { ACCOUNTABILITY_MODULE } from "../modules/accountability"
import type AccountabilityModuleService from "../modules/accountability/service"

export const config = {
  name: "clean-order-tick",
  schedule: "0 2 * * *",
}

const SIX_MONTHS_MS = 180 * 24 * 60 * 60 * 1000

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

  let warnedRecovered = 0
  for (const s of warned) {
    const last =
      s.last_clean_order_at == null
        ? null
        : typeof s.last_clean_order_at === "string"
          ? new Date(s.last_clean_order_at)
          : s.last_clean_order_at
    if (last && now.getTime() - last.getTime() >= SIX_MONTHS_MS) {
      await accountability.updateBuyerAccountStatuses({
        id: s.id,
        state: "normal",
        strike_count: 0,
      })
      warnedRecovered++
      logger.info(`Buyer ${s.customer_id}: warned → normal (6mo clean).`)
    }
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
