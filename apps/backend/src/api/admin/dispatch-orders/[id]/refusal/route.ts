import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { DISPATCH_MODULE } from "../../../../../modules/dispatch"
import type DispatchModuleService from "../../../../../modules/dispatch/service"
import { ACCOUNTABILITY_MODULE } from "../../../../../modules/accountability"
import type AccountabilityModuleService from "../../../../../modules/accountability/service"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"

/**
 * POST /admin/dispatch-orders/:id/refusal
 * Body: { rider_photo_url?: string, rider_notes?: string }
 *
 * Rider (entered by admin / hub cashier on the rider's behalf) flags a
 * delivery as refused. Flips the DispatchOrder delivery_status to "refused"
 * and opens a pending RefusalDispute. Idempotent: a 2nd call on the same
 * dispatch order returns the existing dispute.
 */
export async function POST(req: MedusaRequest, res: MedusaResponse) {
  const dispatchService: DispatchModuleService =
    req.scope.resolve(DISPATCH_MODULE)
  const accountability: AccountabilityModuleService =
    req.scope.resolve(ACCOUNTABILITY_MODULE)
  const query = req.scope.resolve(ContainerRegistrationKeys.QUERY)

  const dispatchOrderId = req.params.id
  const body = req.body as { rider_photo_url?: string; rider_notes?: string }

  const [dispatchOrder] = await dispatchService.listDispatchOrders(
    { id: dispatchOrderId },
    { take: 1 }
  )
  if (!dispatchOrder) {
    res.status(404).json({ error: "Dispatch order not found" })
    return
  }

  // Resolve order_id → customer for the dispute record.
  const { data: orderRows } = await query.graph({
    entity: "order",
    fields: ["id", "customer_id"],
    filters: { id: dispatchOrder.order_id },
  })
  const order = orderRows[0] as
    | { id: string; customer_id: string | null }
    | undefined
  if (!order?.customer_id) {
    res.status(404).json({ error: "Order or customer not found" })
    return
  }

  // Idempotency: return the existing dispute for this dispatch order.
  const [existing] = await accountability.listRefusalDisputes(
    { dispatch_order_id: dispatchOrderId },
    { take: 1 }
  )
  if (existing) {
    res.json({ dispute: existing, message: "Already opened." })
    return
  }

  await dispatchService.updateDispatchOrders({
    id: dispatchOrderId,
    delivery_status: "refused",
  })

  const dispute = await accountability.createRefusalDisputes({
    order_id: order.id,
    dispatch_order_id: dispatchOrderId,
    customer_id: order.customer_id,
    rider_id: dispatchOrder.rider_id,
    rider_photo_url: body.rider_photo_url ?? null,
    rider_notes: body.rider_notes ?? null,
    resolution: "pending",
    deposit_action: "none",
  })

  res.status(201).json({ dispute })
}
