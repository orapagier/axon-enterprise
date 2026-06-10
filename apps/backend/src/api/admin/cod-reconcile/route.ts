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

  // The date range is applied in the DB query — filtering a take-limited page
  // in memory would silently drop in-range rows once the ledger outgrows it.
  const createdAt: Record<string, Date> = {}
  if (from) createdAt.$gte = from
  if (to) createdAt.$lte = to
  const rangeFilter = from || to ? { created_at: createdAt } : {}

  const [collectedF, remittedF, otcF] = await Promise.all([
    ledger.listCodTransactions(
      { type: "cod_collected", ...rangeFilter },
      { order: { created_at: "DESC" }, take: 500 }
    ),
    ledger.listCodTransactions(
      { type: "rider_remitted", ...rangeFilter },
      { order: { created_at: "DESC" }, take: 500 }
    ),
    ledger.listCodTransactions(
      { type: "otc_collected", ...rangeFilter },
      { order: { created_at: "DESC" }, take: 500 }
    ),
  ])

  const totalCollected = collectedF.reduce((s, t) => s + t.amount, 0)
  const totalRemitted = remittedF.reduce((s, t) => s + t.amount, 0)
  // Rider outstanding = rider-collected cash not yet remitted. OTC is excluded
  // on purpose: it's hub-held from the start, so it can never be "outstanding".
  const outstanding = totalCollected - totalRemitted
  const totalOtc = otcF.reduce((s, t) => s + t.amount, 0)

  res.json({
    collected: collectedF,
    remitted: remittedF,
    otc_collected: otcF,
    totals: {
      collected_centavos: totalCollected,
      remitted_centavos: totalRemitted,
      outstanding_centavos: outstanding,
      otc_collected_centavos: totalOtc,
    },
  })
}
