import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { DISPATCH_MODULE } from "../../../../../modules/dispatch"
import type DispatchModuleService from "../../../../../modules/dispatch/service"
import { getRiderId } from "../../../../../lib/rider-auth"
import { recordRefusal } from "../../../../../lib/delivery-actions"

/**
 * POST /rider/orders/:id/refused   (:id = dispatch_order id)
 * Body: { rider_photo_url?: string, rider_notes?: string }
 *
 * The rider marks one of THEIR orders refused, opening a refusal dispute
 * (buyer/seller respond, admin resolves → buyer strike on buyer_fault).
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

  const body = (req.body ?? {}) as {
    rider_photo_url?: string
    rider_notes?: string
  }
  const result = await recordRefusal(req.scope, {
    dispatchOrderId,
    riderId,
    riderPhotoUrl: body.rider_photo_url,
    riderNotes: body.rider_notes,
  })

  if (!result.ok) {
    res.status(result.status).json({ error: result.error })
    return
  }
  res
    .status(result.created ? 201 : 200)
    .json({ dispute: result.dispute, created: result.created })
}
