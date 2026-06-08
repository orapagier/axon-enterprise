import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"
import { COD_LEDGER_MODULE } from "../../../../../modules/cod-ledger"
import type CodLedgerModuleService from "../../../../../modules/cod-ledger/service"
import { isDuplicateCodTransaction } from "../../../../../modules/cod-ledger/is-duplicate"

/**
 * POST /admin/orders/:id/cod-collected
 * Body: { amount: number, rider_id?: string, reference?: string, notes?: string }
 *
 * Records that the rider collected cash from the buyer for this order.
 * Writes a `cod_collected` ledger row. Idempotency: if a `cod_collected`
 * row already exists for the order, returns 409.
 */
export async function POST(req: MedusaRequest, res: MedusaResponse) {
  const ledger: CodLedgerModuleService = req.scope.resolve(COD_LEDGER_MODULE)
  const query = req.scope.resolve(ContainerRegistrationKeys.QUERY)

  const orderId = req.params.id
  const body = req.body as {
    amount?: number
    rider_id?: string
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
    { order_id: orderId, type: "cod_collected" },
    { take: 1 }
  )
  if (existing.length > 0) {
    res.status(409).json({
      error: "Order already marked as cod_collected.",
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
      type: "cod_collected",
      amount: body.amount,
      reference: body.reference ?? null,
      rider_id: body.rider_id ?? null,
      recorded_by: actorId,
      notes: body.notes ?? null,
    })
  } catch (err) {
    // Lost the race against a concurrent collect: the unique index rejected the
    // second insert. Surface it as the same 409 the read check returns.
    if (isDuplicateCodTransaction(err)) {
      const [existingRow] = await ledger.listCodTransactions(
        { order_id: orderId, type: "cod_collected" },
        { take: 1 }
      )
      res.status(409).json({
        error: "Order already marked as cod_collected.",
        transaction: existingRow,
      })
      return
    }
    throw err
  }

  res.status(201).json({ transaction: tx })
}
