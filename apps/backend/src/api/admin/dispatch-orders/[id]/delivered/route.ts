import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { RIDER_MODULE } from "../../../../../modules/rider"
import type RiderModuleService from "../../../../../modules/rider/service"
import { confirmDelivery } from "../../../../../lib/delivery-actions"

/**
 * POST /admin/dispatch-orders/:id/delivered
 * Body: { amount?: number (centavos), rider_id?: string }
 *
 * Admin / hub cashier confirms a delivery on the rider's behalf. Marks the
 * order delivered and auto-records cod_collected for COD (skipped for OTC,
 * already paid at the counter). Shares logic with the rider self-service route.
 */
export async function POST(req: MedusaRequest, res: MedusaResponse) {
  const dispatchOrderId = req.params.id
  const body = (req.body ?? {}) as { amount?: number; rider_id?: string }

  // If a rider_id is supplied here it's a (late) assignment — block suspended.
  if (body.rider_id) {
    const riders: RiderModuleService = req.scope.resolve(RIDER_MODULE)
    const [rider] = await riders.listRiders(
      { id: body.rider_id },
      { take: 1 }
    )
    if (!rider) {
      res.status(400).json({ error: "rider_id does not match a known rider" })
      return
    }
    if (rider.status !== "active") {
      res.status(409).json({
        error: `Rider is ${rider.status}; cannot assign new orders until reactivated.`,
      })
      return
    }
  }

  const actorId =
    (req as unknown as { auth_context?: { actor_id?: string } }).auth_context
      ?.actor_id ?? null

  const result = await confirmDelivery(req.scope, {
    dispatchOrderId,
    riderId: body.rider_id,
    amountOverride: body.amount,
    recordedBy: actorId,
  })

  if (!result.ok) {
    res.status(result.status).json({ error: result.error })
    return
  }
  res.status(200).json({
    dispatch_order_id: result.dispatch_order_id,
    delivery_status: "delivered",
    payment: result.payment,
    transaction: result.transaction,
  })
}
