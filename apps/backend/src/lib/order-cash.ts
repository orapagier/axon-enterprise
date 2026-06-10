import type { MedusaContainer } from "@medusajs/framework/types"
import { COD_LEDGER_MODULE } from "../modules/cod-ledger"
import type CodLedgerModuleService from "../modules/cod-ledger/service"

/**
 * Whether an order's cash is in the hub's hands. This is the **gate** a future
 * producer payout must check: a producer is only payable once the order's cash
 * is settled, i.e.
 *   - OTC: paid at the counter (otc_collected), or
 *   - COD: collected by a rider AND remitted to the hub (cod_collected + rider_remitted).
 *
 * Producer payout itself is a separate phase; this predicate is the wiring so
 * that, when it lands, payout reads `settled` rather than "delivered".
 */
export type OrderCashState = {
  order_id: string
  collected: boolean
  remitted: boolean
  otc: boolean
  settled: boolean
}

export async function getOrderCashState(
  container: MedusaContainer,
  orderId: string
): Promise<OrderCashState> {
  const ledger: CodLedgerModuleService = container.resolve(COD_LEDGER_MODULE)
  const rows = await ledger.listCodTransactions({ order_id: orderId }, { take: 10 })

  const has = (t: string) => rows.some((r) => r.type === t)
  const otc = has("otc_collected")
  const collected = has("cod_collected")
  const remitted = has("rider_remitted")
  const settled = otc || (collected && remitted)

  return { order_id: orderId, collected, remitted, otc, settled }
}
