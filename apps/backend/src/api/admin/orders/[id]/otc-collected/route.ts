import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"
import { recordOtcCollected } from "../../../../../lib/otc-sale"

/**
 * POST /admin/orders/:id/otc-collected
 * Body: { amount: number, reference?: string, notes?: string }
 *
 * Records that the buyer paid this order Over the Counter at the hub. Writes an
 * `otc_collected` ledger row (hub-held cash, NO remittance leg) via the shared
 * `recordOtcCollected` helper.
 *
 * @deprecated OTC is now walk-in only and counter sales are created through
 * `POST /admin/otc-counter`, which records the ledger row itself. This per-order
 * route remains only to back-fill a row against an existing order; it is no
 * longer the primary path. (Reframe 2026-06-10: OTC = in-person counter sale,
 * not an online payment method — locked buyers cannot place online orders.)
 */
export async function POST(req: MedusaRequest, res: MedusaResponse) {
  const query = req.scope.resolve(ContainerRegistrationKeys.QUERY)

  const orderId = req.params.id
  const body = req.body as {
    amount?: number
    reference?: string
    notes?: string
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

  const actorId =
    (req as unknown as { auth_context?: { actor_id?: string } }).auth_context
      ?.actor_id ?? null

  const result = await recordOtcCollected(req.scope, {
    orderId,
    customerId: order.customer_id,
    amount: body.amount ?? 0,
    reference: body.reference ?? null,
    notes: body.notes ?? null,
    recordedBy: actorId,
  })

  if (!result.ok) {
    res.status(result.status).json({ error: result.error })
    return
  }
  if (!result.created) {
    res.status(409).json({
      error: "Order already marked as otc_collected.",
      transaction: result.transaction,
    })
    return
  }

  res.status(201).json({ transaction: result.transaction })
}
