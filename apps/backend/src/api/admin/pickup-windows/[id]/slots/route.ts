import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"
import { PICKUP_MODULE } from "../../../../../modules/pickup"
import PickupModuleService from "../../../../../modules/pickup/service"

/**
 * GET /admin/pickup-windows/:id/slots
 * Returns slots with producer + listing info via query.graph.
 */
export async function GET(req: MedusaRequest, res: MedusaResponse) {
  const service: PickupModuleService = req.scope.resolve(PICKUP_MODULE)
  const query = req.scope.resolve(ContainerRegistrationKeys.QUERY)

  const slots = await service.listPickupSlots(
    { pickup_window_id: req.params.id },
    { take: 500, order: { created_at: "ASC" } }
  )

  res.json({ slots, count: slots.length })
}

/**
 * PATCH /admin/pickup-windows/:id/slots  (mark-picked-up action)
 * Body: { action: "mark-picked-up" }
 */
export async function PATCH(req: MedusaRequest, res: MedusaResponse) {
  const service: PickupModuleService = req.scope.resolve(PICKUP_MODULE)
  const body = req.body as { action?: string }

  if (body.action === "mark-picked-up") {
    const slots = await service.listPickupSlots(
      { pickup_window_id: req.params.id, status: "reserved" },
      { take: 1 }
    )
    if (!slots.length) {
      res.status(400).json({ error: "No reserved slots to mark as picked up." })
      return
    }

    const now = new Date().toISOString()
    await service.updatePickupSlots({
      id: slots[0].id,
      status: "picked_up",
      picked_up_at: now,
    })

    const refreshed = await service.listPickupSlots(
      { pickup_window_id: req.params.id },
      { take: 500 }
    )
    res.json({ slots: refreshed })
    return
  }

  res.status(400).json({ error: "Unsupported action.", code: "INVALID_ACTION" })
}