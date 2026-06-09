import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { DISPATCH_MODULE } from "../../../../../modules/dispatch"
import type DispatchModuleService from "../../../../../modules/dispatch/service"
import { RIDER_MODULE } from "../../../../../modules/rider"
import type RiderModuleService from "../../../../../modules/rider/service"

const VALID_DELIVERY_STATUSES = [
  "pending",
  "delivered",
  "refused",
  "missed",
  "disputed",
]

/**
 * PATCH /admin/dispatch/orders/:id
 * Body: { rider_id?, manifest_position?, delivery_status? }
 *
 * Used by the admin UI to assign a rider, reorder a manifest, or mark a
 * delivery outcome.
 */
export async function PATCH(req: MedusaRequest, res: MedusaResponse) {
  const service: DispatchModuleService = req.scope.resolve(DISPATCH_MODULE)
  const id = req.params.id
  const body = req.body as {
    rider_id?: string | null
    manifest_position?: number
    delivery_status?: string
  }

  const [dispatchOrder] = await service.listDispatchOrders({ id }, { take: 1 })
  if (!dispatchOrder) {
    res.status(404).json({ error: "Dispatch order not found" })
    return
  }

  const update: Record<string, unknown> = { id }
  if (body.rider_id !== undefined) {
    // Assigning a rider (non-null): only an active rider may take new orders.
    // A suspended rider (e.g. flagged by rider-unremitted-tick for unremitted
    // cash) is blocked until an admin reactivates them. Unassigning (null) is
    // always allowed.
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
    update.rider_id = body.rider_id
  }
  if (body.manifest_position !== undefined) {
    update.manifest_position = body.manifest_position
  }
  if (body.delivery_status !== undefined) {
    if (!VALID_DELIVERY_STATUSES.includes(body.delivery_status)) {
      res.status(400).json({ error: "Invalid delivery_status" })
      return
    }
    update.delivery_status = body.delivery_status
    if (body.delivery_status === "delivered") {
      update.delivered_at = new Date()
    }
  }

  const updated = await service.updateDispatchOrders(update)
  res.json({ order: updated })
}
