/**
 * Rider accountability — mirror of the buyer strike system.
 *
 * Suspends any active rider who is carrying too much unremitted COD cash, by
 * either measure:
 *   - balance: total unremitted > RIDER_UNREMITTED_LIMIT_CENTAVOS (default ₱5,000)
 *   - aging:   their oldest unremitted collection is older than
 *              RIDER_UNREMITTED_AGING_DAYS (default 3 days)
 *
 * "Unremitted" is computed per order: a cod_collected row whose order_id has no
 * matching rider_remitted row. Suspended riders can't be assigned new orders
 * (enforced in the dispatch assign + delivered routes). Recovery is admin-driven
 * (PATCH /admin/riders/:id status=active once the rider settles).
 *
 * Run on-demand with:
 *   npx medusa exec ./src/jobs/rider-unremitted-tick.ts
 */
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"
import { RIDER_MODULE } from "../modules/rider"
import type RiderModuleService from "../modules/rider/service"
import { COD_LEDGER_MODULE } from "../modules/cod-ledger"
import type CodLedgerModuleService from "../modules/cod-ledger/service"
import { runJob, type JobInput } from "../lib/job-observability"
import { unremittedByRider, DAY_MS } from "../lib/cod-aging"

export const config = {
  name: "rider-unremitted-tick",
  schedule: "0 3 * * *",
}

const LIMIT_CENTAVOS = Number(
  process.env.RIDER_UNREMITTED_LIMIT_CENTAVOS ?? 500_000
)
const AGING_DAYS = Number(process.env.RIDER_UNREMITTED_AGING_DAYS ?? 3)

export default (input: JobInput) =>
  runJob("rider-unremitted-tick", input, async (container) => {
    const logger = container.resolve(ContainerRegistrationKeys.LOGGER)
    const riders: RiderModuleService = container.resolve(RIDER_MODULE)
    const ledger: CodLedgerModuleService = container.resolve(COD_LEDGER_MODULE)

    const [collected, remitted] = await Promise.all([
      ledger.listCodTransactions({ type: "cod_collected" }, { take: 5000 }),
      ledger.listCodTransactions({ type: "rider_remitted" }, { take: 5000 }),
    ])

    // Per-rider unremitted balance, computed by the same rule the aging report
    // uses (an order is settled once any rider_remitted row exists for it).
    const now = Date.now()
    const byRider = new Map(
      unremittedByRider(collected, remitted).map((r) => [r.rider_id, r])
    )

    const activeRiders = await riders.listRiders(
      { status: "active" },
      { take: 1000 }
    )

    let suspended = 0
    for (const rider of activeRiders) {
      const info = byRider.get(rider.id)
      if (!info) continue
      const overBalance = info.outstanding_centavos > LIMIT_CENTAVOS
      const ageDays = (now - info.oldest_ms) / DAY_MS
      const overAge = ageDays > AGING_DAYS
      if (overBalance || overAge) {
        await riders.updateRiders({ id: rider.id, status: "suspended" })
        suspended++
        logger.warn(
          `Rider ${rider.id} (${rider.full_name}) suspended: ₱${(
            info.outstanding_centavos / 100
          ).toFixed(2)} unremitted, oldest ${ageDays.toFixed(1)}d ` +
            `(limit ₱${(LIMIT_CENTAVOS / 100).toFixed(0)} / ${AGING_DAYS}d).`
        )
      }
    }

    logger.info(
      `rider-unremitted-tick: ${suspended} rider(s) suspended.`
    )
  })
