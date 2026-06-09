/**
 * Rider accountability — mirror of the buyer strike system.
 *
 * Suspends any active rider whose unremitted cash (cod_collected − rider_remitted,
 * summed across their orders) exceeds the configured limit. Suspended riders
 * should not be assigned new orders — the system stops handing more cash to a
 * rider who hasn't settled, instead of the hub chasing them manually.
 *
 * Recovery is admin-driven: once the rider settles, an admin flips status back
 * to "active" via PATCH /admin/riders/:id (so a human confirms the cash landed).
 *
 * Limit is tunable with RIDER_UNREMITTED_LIMIT_CENTAVOS (default ₱5,000).
 * Run on-demand with:
 *   npx medusa exec ./src/jobs/rider-unremitted-tick.ts
 *
 * NOTE: this is a balance threshold. Aging (oldest unremitted collection older
 * than N days) is a future refinement.
 */
import type { MedusaContainer } from "@medusajs/framework/types"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"
import { RIDER_MODULE } from "../modules/rider"
import type RiderModuleService from "../modules/rider/service"
import { COD_LEDGER_MODULE } from "../modules/cod-ledger"
import type CodLedgerModuleService from "../modules/cod-ledger/service"

export const config = {
  name: "rider-unremitted-tick",
  schedule: "0 3 * * *",
}

const LIMIT_CENTAVOS = Number(
  process.env.RIDER_UNREMITTED_LIMIT_CENTAVOS ?? 500_000
)

export default async function riderUnremittedTick(container: MedusaContainer) {
  const logger = container.resolve(ContainerRegistrationKeys.LOGGER)
  const riders: RiderModuleService = container.resolve(RIDER_MODULE)
  const ledger: CodLedgerModuleService = container.resolve(COD_LEDGER_MODULE)

  // Aggregate collected and remitted per rider in memory (one pass each).
  const [collected, remitted] = await Promise.all([
    ledger.listCodTransactions({ type: "cod_collected" }, { take: 5000 }),
    ledger.listCodTransactions({ type: "rider_remitted" }, { take: 5000 }),
  ])

  const outstandingByRider = new Map<string, number>()
  for (const t of collected) {
    if (!t.rider_id) continue
    outstandingByRider.set(
      t.rider_id,
      (outstandingByRider.get(t.rider_id) ?? 0) + t.amount
    )
  }
  for (const t of remitted) {
    if (!t.rider_id) continue
    outstandingByRider.set(
      t.rider_id,
      (outstandingByRider.get(t.rider_id) ?? 0) - t.amount
    )
  }

  const activeRiders = await riders.listRiders(
    { status: "active" },
    { take: 1000 }
  )

  let suspended = 0
  for (const rider of activeRiders) {
    const outstanding = outstandingByRider.get(rider.id) ?? 0
    if (outstanding > LIMIT_CENTAVOS) {
      await riders.updateRiders({ id: rider.id, status: "suspended" })
      suspended++
      logger.warn(
        `Rider ${rider.id} (${rider.full_name}) suspended: ₱${(
          outstanding / 100
        ).toFixed(2)} unremitted > limit ₱${(LIMIT_CENTAVOS / 100).toFixed(2)}.`
      )
    }
  }

  logger.info(
    `rider-unremitted-tick finished: ${suspended} rider(s) suspended for unremitted cash.`
  )
}
