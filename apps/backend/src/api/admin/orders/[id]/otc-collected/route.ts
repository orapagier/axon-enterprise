import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"
import { COD_LEDGER_MODULE } from "../../../../../modules/cod-ledger"
import type CodLedgerModuleService from "../../../../../modules/cod-ledger/service"
import { isDuplicateCodTransaction } from "../../../../../modules/cod-ledger/is-duplicate"

/**
 * POST /admin/orders/:id/otc-collected
 * Body: { amount: number, reference?: string, notes?: string }
 *
 * Records that the buyer paid this order Over the Counter at the hub. Writes an
 * `otc_collected` ledger row — hub-held cash with NO remittance leg (no rider),
 * so it never appears in the rider collected−remitted outstanding total.
 *
 * Recorded at the moment the cashier confirms payment (not at online order
 * placement): a prepay-locked buyer who picks OTC online pays later at the
 * counter, so auto-marking at placement would falsely show the order as paid.
 *
 * Idempotent: the unique (order_id, type) index allows at most one
 * `otc_collected` row per order; a duplicate returns 409.
 */
export async function POST(req: MedusaRequest, res: MedusaResponse) {
  const ledger: CodLedgerModuleService = req.scope.resolve(COD_LEDGER_MODULE)
  const query = req.scope.resolve(ContainerRegistrationKeys.QUERY)

  const orderId = req.params.id
  const body = req.body as {
    amount?: number
    reference?: string
    notes?: string
  }
  if (!body.amount || body.amount <= 0) {
    res.status(400).json({ error: "amount (centavos > 0) required" })
    return
  }

  const { data: orderRows } = await query.graph({
    entity: "order",
    fields: ["id", "customer_id"],
    filters: { id: orderId },
  })
  const order = orderRows[0] as
    | { id: string; customer_id: string | null }
    | undefined
  if (!order?.customer_id) {
    res.status(404).json({ error: "Order or customer not found" })
    return
  }

  const existing = await ledger.listCodTransactions(
    { order_id: orderId, type: "otc_collected" },
    { take: 1 }
  )
  if (existing.length > 0) {
    res.status(409).json({
      error: "Order already marked as otc_collected.",
      transaction: existing[0],
    })
    return
  }

  const actorId =
    (req as unknown as { auth_context?: { actor_id?: string } }).auth_context
      ?.actor_id ?? null

  let tx
  try {
    tx = await ledger.createCodTransactions({
      customer_id: order.customer_id,
      order_id: orderId,
      type: "otc_collected",
      amount: body.amount,
      reference: body.reference ?? null,
      // OTC has no rider — cash is collected at the hub counter.
      rider_id: null,
      recorded_by: actorId,
      notes: body.notes ?? null,
    })
  } catch (err) {
    // Lost the race against a concurrent collect: the unique index rejected the
    // second insert. Surface it as the same 409 the read check returns.
    if (isDuplicateCodTransaction(err)) {
      const [existingRow] = await ledger.listCodTransactions(
        { order_id: orderId, type: "otc_collected" },
        { take: 1 }
      )
      res.status(409).json({
        error: "Order already marked as otc_collected.",
        transaction: existingRow,
      })
      return
    }
    throw err
  }

  res.status(201).json({ transaction: tx })
}
