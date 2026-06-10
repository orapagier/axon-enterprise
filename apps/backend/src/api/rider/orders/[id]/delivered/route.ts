import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { DISPATCH_MODULE } from "../../../../../modules/dispatch"
import type DispatchModuleService from "../../../../../modules/dispatch/service"
import { getRiderId } from "../../../../../lib/rider-auth"
import { confirmDelivery } from "../../../../../lib/delivery-actions"

/**
 * POST /rider/orders/:id/delivered   (:id = dispatch_order id)
 * Body: { amount?: number (centavos) }
 *
 * The rider confirms delivery of one of THEIR orders (QR scan / button).
 * Marks delivered and auto-records cod_collected for COD.
 */
export async function POST(req: MedusaRequest, res: MedusaResponse) {
  const riderId = getRiderId(req)
  const dispatchOrderId = req.params.id
  const dispatchService: DispatchModuleService =
    req.scope.resolve(DISPATCH_MODULE)

  const [dispatchOrder] = await dispatchService.listDispatchOrders(
    { id: dispatchOrderId },
    { take: 1 }
  )
  if (!dispatchOrder) {
    res.status(404).json({ error: "Dispatch order not found" })
    return
  }
  if (dispatchOrder.rider_id !== riderId) {
    res.status(403).json({ error: "This order is not assigned to you." })
    return
  }

  const body = (req.body ?? {}) as { amount?: number }
  const result = await confirmDelivery(req.scope, {
    dispatchOrderId,
    riderId,
    amountOverride: body.amount,
    recordedBy: `rider:${riderId}`,
  })

  if (!result.ok) {
    res.status(result.status).json({ error: result.error })
    return
  }
  res.json({
    dispatch_order_id: result.dispatch_order_id,
    delivery_status: "delivered",
    payment: result.payment,
    transaction: result.transaction,
  })
}
