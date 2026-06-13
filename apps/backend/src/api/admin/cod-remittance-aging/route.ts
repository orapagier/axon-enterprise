import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { COD_LEDGER_MODULE } from "../../../modules/cod-ledger"
import type CodLedgerModuleService from "../../../modules/cod-ledger/service"
import {
  remittanceAging,
  collectionShortfalls,
  remittanceShortfalls,
  type LedgerRowLite,
} from "../../../lib/cod-aging"

/**
 * GET /admin/cod-remittance-aging
 *
 * The all-time companion to /admin/cod-reconcile (which is date-ranged): how
 * much rider-held cash is still unremitted, bucketed by age, plus any
 * shortfalls (collected/remitted < expected). Intentionally NOT date-filtered —
 * an unremitted collection from 10 days ago is exactly what an aging report
 * must surface, and a date window would hide it.
 */
export async function GET(req: MedusaRequest, res: MedusaResponse) {
  const ledger: CodLedgerModuleService = req.scope.resolve(COD_LEDGER_MODULE)

  const [collected, remitted] = (await Promise.all([
    ledger.listCodTransactions(
      { type: "cod_collected" },
      { order: { created_at: "DESC" }, take: 5000 }
    ),
    ledger.listCodTransactions(
      { type: "rider_remitted" },
      { order: { created_at: "DESC" }, take: 5000 }
    ),
  ])) as unknown as [LedgerRowLite[], LedgerRowLite[]]

  const now = Date.now()
  const aging = remittanceAging(collected, remitted, now)
  const collShort = collectionShortfalls(collected)
  const remitShort = remittanceShortfalls(collected, remitted)

  res.json({
    generated_at: now,
    aging,
    shortfalls: {
      collection: collShort,
      remittance: remitShort,
      total_centavos:
        collShort.reduce((s, r) => s + r.shortfall_centavos, 0) +
        remitShort.reduce((s, r) => s + r.shortfall_centavos, 0),
    },
  })
}
