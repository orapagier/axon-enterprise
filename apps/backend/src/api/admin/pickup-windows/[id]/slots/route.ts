import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { PICKUP_MODULE } from "../../../../../modules/pickup"
import PickupModuleService from "../../../../../modules/pickup/service"

/**
 * GET /admin/pickup-windows/:id/slots
 * Returns slots for a window, ordered by creation.
 */
export async function GET(req: MedusaRequest, res: MedusaResponse) {
  const service: PickupModuleService = req.scope.resolve(PICKUP_MODULE)
  const slots = await service.listPickupSlots(
    { pickup_window_id: req.params.id },
    { take: 500, order: { created_at: "ASC" } }
  )
  res.json({ slots, count: slots.length })
}

/**
 * PATCH /admin/pickup-windows/:id/slots
 * Body: { action: "mark-all-picked-up" } | { action: "mark-picked-up", slot_ids: string[] }
 */
export async function PATCH(req: MedusaRequest, res: MedusaResponse) {
  const service: PickupModuleService = req.scope.resolve(PICKUP_MODULE)
  const body = req.body as {
    action?: string
    slot_ids?: string[]
  }

  let targets: string[] = []

  if (body.action === "mark-all-picked-up") {
    const reserved = await service.listPickupSlots(
      { pickup_window_id: req.params.id, status: "reserved" },
      { take: 500 }
    )
    targets = reserved.map((s) => s.id)
  } else if (body.action === "mark-picked-up" && Array.isArray(body.slot_ids)) {
    targets = body.slot_ids
  } else {
    res.status(400).json({
      error:
        "Supported actions: 'mark-all-picked-up' (no body), or 'mark-picked-up' with slot_ids[].",
      code: "INVALID_ACTION",
    })
    return
  }

  if (!targets.length) {
    res.status(400).json({ error: "No matching slots to mark as picked up." })
    return
  }

  const now = new Date()
  for (const id of targets) {
    await service.updatePickupSlots({
      id,
      status: "picked_up",
      picked_up_at: now,
    })
  }

  const refreshed = await service.listPickupSlots(
    { pickup_window_id: req.params.id },
    { take: 500 }
  )
  res.json({ slots: refreshed, updated: targets.length })
}