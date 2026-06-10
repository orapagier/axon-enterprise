import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { COD_LEDGER_MODULE } from "../../../modules/cod-ledger"
import type CodLedgerModuleService from "../../../modules/cod-ledger/service"
import { getRiderId } from "../../../lib/rider-auth"

/**
 * GET /rider/summary — the rider's cash position (for the rider PWA).
 *
 * Mirrors the rider-unremitted-tick math so the rider sees exactly what the
 * suspension rule sees: outstanding = their cod_collected rows whose order has
 * no rider_remitted row yet. Also reports today's (Asia/Manila) delivered
 * count + cash, and the suspension limit so the UI can warn before the
 * nightly job acts.
 */

const MANILA_OFFSET_MS = 8 * 60 * 60_000
const LIMIT_CENTAVOS = Number(
  process.env.RIDER_UNREMITTED_LIMIT_CENTAVOS ?? 500_000
)

export async function GET(req: MedusaRequest, res: MedusaResponse) {
  const riderId = getRiderId(req)
  const ledger: CodLedgerModuleService = req.scope.resolve(COD_LEDGER_MODULE)

  const [collected, remitted] = await Promise.all([
    ledger.listCodTransactions(
      { rider_id: riderId, type: "cod_collected" },
      { take: 2000 }
    ),
    ledger.listCodTransactions({ type: "rider_remitted" }, { take: 2000 }),
  ])

  const remittedOrderIds = new Set(
    remitted.map((t) => t.order_id).filter(Boolean) as string[]
  )

  let outstanding = 0
  for (const t of collected) {
    if (t.order_id && remittedOrderIds.has(t.order_id)) continue
    outstanding += Number(t.amount)
  }

  const now = new Date()
  const local = new Date(now.getTime() + MANILA_OFFSET_MS)
  const startOfDayUtc = new Date(
    Date.UTC(local.getUTCFullYear(), local.getUTCMonth(), local.getUTCDate()) -
      MANILA_OFFSET_MS
  )
  const todayRows = collected.filter(
    (t) => new Date(t.created_at) >= startOfDayUtc
  )

  res.json({
    outstanding_centavos: outstanding,
    limit_centavos: LIMIT_CENTAVOS,
    today: {
      delivered_count: todayRows.length,
      collected_centavos: todayRows.reduce(
        (sum, t) => sum + Number(t.amount),
        0
      ),
    },
  })
}
