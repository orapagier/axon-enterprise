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
const AGING_DAYS = Number(process.env.RIDER_UNREMITTED_AGING_DAYS ?? 3)
const DAY_MS = 24 * 60 * 60 * 1000

export default async function riderUnremittedTick(container: MedusaContainer) {
  const logger = container.resolve(ContainerRegistrationKeys.LOGGER)
  const riders: RiderModuleService = container.resolve(RIDER_MODULE)
  const ledger: CodLedgerModuleService = container.resolve(COD_LEDGER_MODULE)

  const [collected, remitted] = await Promise.all([
    ledger.listCodTransactions({ type: "cod_collected" }, { take: 5000 }),
    ledger.listCodTransactions({ type: "rider_remitted" }, { take: 5000 }),
  ])

  // An order's COD is settled once a rider_remitted row exists for it.
  const remittedOrderIds = new Set(
    remitted.map((t) => t.order_id).filter(Boolean) as string[]
  )

  const now = Date.now()
  const byRider = new Map<string, { outstanding: number; oldest: number }>()
  for (const t of collected) {
    if (!t.rider_id) continue
    if (t.order_id && remittedOrderIds.has(t.order_id)) continue // already remitted
    const ts = new Date(t.created_at).getTime()
    const cur = byRider.get(t.rider_id) ?? { outstanding: 0, oldest: ts }
    cur.outstanding += t.amount
    cur.oldest = Math.min(cur.oldest, ts)
    byRider.set(t.rider_id, cur)
  }

  const activeRiders = await riders.listRiders(
    { status: "active" },
    { take: 1000 }
  )

  let suspended = 0
  for (const rider of activeRiders) {
    const info = byRider.get(rider.id)
    if (!info) continue
    const overBalance = info.outstanding > LIMIT_CENTAVOS
    const ageDays = (now - info.oldest) / DAY_MS
    const overAge = ageDays > AGING_DAYS
    if (overBalance || overAge) {
      await riders.updateRiders({ id: rider.id, status: "suspended" })
      suspended++
      logger.warn(
        `Rider ${rider.id} (${rider.full_name}) suspended: ₱${(
          info.outstanding / 100
        ).toFixed(2)} unremitted, oldest ${ageDays.toFixed(1)}d ` +
          `(limit ₱${(LIMIT_CENTAVOS / 100).toFixed(0)} / ${AGING_DAYS}d).`
      )
    }
  }

  logger.info(
    `rider-unremitted-tick finished: ${suspended} rider(s) suspended.`
  )
}
