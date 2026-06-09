import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { COD_LEDGER_MODULE } from "../../../modules/cod-ledger"
import type CodLedgerModuleService from "../../../modules/cod-ledger/service"

/**
 * GET /admin/cod-reconcile
 * Query: from?, to? (ISO date strings, optional)
 *
 * Returns ledger rows with running totals so the admin can see end-of-day
 * reconciliation at a glance:
 *  - rider cash: cod_collected (rider-held) vs rider_remitted; outstanding is
 *    what riders still owe the hub.
 *  - hub cash: otc_collected — paid at the counter, already in the hub's hands,
 *    so it has no remittance leg and is reported separately (never "outstanding").
 */
export async function GET(req: MedusaRequest, res: MedusaResponse) {
  const ledger: CodLedgerModuleService = req.scope.resolve(COD_LEDGER_MODULE)

  const from = req.query.from ? new Date(req.query.from as string) : null
  const to = req.query.to ? new Date(req.query.to as string) : null

  const [collected, remitted, otc] = await Promise.all([
    ledger.listCodTransactions(
      { type: "cod_collected" },
      { order: { created_at: "DESC" }, take: 500 }
    ),
    ledger.listCodTransactions(
      { type: "rider_remitted" },
      { order: { created_at: "DESC" }, take: 500 }
    ),
    ledger.listCodTransactions(
      { type: "otc_collected" },
      { order: { created_at: "DESC" }, take: 500 }
    ),
  ])

  const inRange = (createdAt: string | Date) => {
    if (!from && !to) return true
    const d = typeof createdAt === "string" ? new Date(createdAt) : createdAt
    if (from && d < from) return false
    if (to && d > to) return false
    return true
  }

  const collectedF = collected.filter((t) => inRange(t.created_at))
  const remittedF = remitted.filter((t) => inRange(t.created_at))

  const totalCollected = collectedF.reduce((s, t) => s + t.amount, 0)
  const totalRemitted = remittedF.reduce((s, t) => s + t.amount, 0)
  const outstanding = totalCollected - totalRemitted

  res.json({
    collected: collectedF,
    remitted: remittedF,
    totals: {
      collected_centavos: totalCollected,
      remitted_centavos: totalRemitted,
      outstanding_centavos: outstanding,
    },
  })
}
