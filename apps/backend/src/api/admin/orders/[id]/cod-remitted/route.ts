import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"
import { COD_LEDGER_MODULE } from "../../../../../modules/cod-ledger"
import type CodLedgerModuleService from "../../../../../modules/cod-ledger/service"
import { isDuplicateCodTransaction } from "../../../../../modules/cod-ledger/is-duplicate"

/**
 * POST /admin/orders/:id/cod-remitted
 * Body: { amount: number, rider_id: string, notes?: string }
 *
 * Records that the rider handed cash to the hub cashier for this order.
 * Writes a `rider_remitted` ledger row. Idempotency: 409 if already remitted.
 */
export async function POST(req: MedusaRequest, res: MedusaResponse) {
  const ledger: CodLedgerModuleService = req.scope.resolve(COD_LEDGER_MODULE)
  const query = req.scope.resolve(ContainerRegistrationKeys.QUERY)

  const orderId = req.params.id
  const body = req.body as {
    amount?: number
    rider_id?: string
    notes?: string
  }
  if (!body.amount || body.amount <= 0) {
    res.status(400).json({ error: "amount (centavos > 0) required" })
    return
  }
  if (!body.rider_id) {
    res.status(400).json({ error: "rider_id required" })
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

  const existingRemit = await ledger.listCodTransactions(
    { order_id: orderId, type: "rider_remitted" },
    { take: 1 }
  )
  if (existingRemit.length > 0) {
    res.status(409).json({
      error: "Order already marked as rider_remitted.",
      transaction: existingRemit[0],
    })
    return
  }

  const actorId =
    (req as unknown as { auth_context?: { actor_id?: string } }).auth_context
      ?.actor_id ?? null

  const tx = await ledger.createCodTransactions({
    customer_id: order.customer_id,
    order_id: orderId,
    type: "rider_remitted",
    amount: body.amount,
    rider_id: body.rider_id,
    recorded_by: actorId,
    notes: body.notes ?? null,
  })

  res.status(201).json({ transaction: tx })
}
