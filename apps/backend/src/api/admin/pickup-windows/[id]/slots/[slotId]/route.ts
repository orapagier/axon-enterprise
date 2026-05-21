import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { PICKUP_MODULE } from "../../../../../modules/pickup"
import PickupModuleService from "../../../../../modules/pickup/service"
import { validateSlotStatusTransition } from "../../../../../modules/pickup/validators"

/**
 * PATCH /admin/pickup-windows/:id/slots/:slotId
 * Body: { status?, picked_up_at?, notes? }
 */
export async function PATCH(req: MedusaRequest, res: MedusaResponse) {
  const service: PickupModuleService = req.scope.resolve(PICKUP_MODULE)
  const slots = await service.listPickupSlots(
    { id: req.params.slotId, pickup_window_id: req.params.id },
    { take: 1 }
  )
  if (!slots.length) {
    res.status(404).json({ error: "Slot not found." })
    return
  }
  const slot = slots[0]
  const body = req.body as {
    status?: string
    picked_up_at?: string | null
    notes?: string | null
  }

  const update: Record<string, unknown> = {}

  // Status transition
  if (body.status && body.status !== slot.status) {
    // Check if window date has passed
    const windows = await service.listPickupWindows(
      { id: req.params.id },
      { take: 1 }
    )
    const window = windows[0]
    const windowDate = typeof window?.date === "string"
      ? new Date(window.date)
      : window?.date ?? new Date()
    const now = new Date()
    const windowDatePassed = windowDate < now

    const transition = validateSlotStatusTransition(
      slot.status as "reserved" | "picked_up" | "no_show" | "rejected",
      body.status as "reserved" | "picked_up" | "no_show" | "rejected",
      true, // isAdmin
      windowDatePassed
    )
    if (!transition.ok) {
      res.status(400).json({
        error: transition.errors[0].message,
        code: transition.errors[0].code,
      })
      return
    }
    update.status = body.status

    // Auto-set picked_up_at when marking picked_up
    if (body.status === "picked_up") {
      update.picked_up_at = new Date().toISOString()
    }

    // If transitioning back from full to open (slot cancelled), update window
    if (body.status === "rejected" || body.status === "no_show") {
      if (window && window.reserved_kg > 0) {
        const newReserved = Math.max(0, (window.reserved_kg ?? 0) - (slot.estimated_kg ?? 0))
        const windowUpdate: Record<string, unknown> = { reserved_kg: newReserved }
        if (window.status === "full" && window.capacity_kg !== null && newReserved < window.capacity_kg) {
          windowUpdate.status = "open"
        }
        await service.updatePickupWindows({ id: window.id, ...windowUpdate })
      }
    }
  }

  if (body.picked_up_at !== undefined) {
    update.picked_up_at = body.picked_up_at
  }

  if (body.notes !== undefined) {
    update.notes = body.notes
  }

  if (Object.keys(update).length === 0) {
    res.json({ slot })
    return
  }

  await service.updatePickupSlots({ id: slot.id, ...update })
  const refreshed = (await service.listPickupSlots({ id: slot.id }, { take: 1 }))[0]
  res.json({ slot: refreshed })
}

/**
 * DELETE /admin/pickup-windows/:id/slots/:slotId
 */
export async function DELETE(req: MedusaRequest, res: MedusaResponse) {
  const service: PickupModuleService = req.scope.resolve(PICKUP_MODULE)
  const slots = await service.listPickupSlots(
    { id: req.params.slotId, pickup_window_id: req.params.id },
    { take: 1 }
  )
  if (!slots.length) {
    res.status(404).json({ error: "Slot not found." })
    return
  }
  const slot = slots[0]

  // Release capacity
  const windows = await service.listPickupWindows({ id: req.params.id }, { take: 1 })
  const window = windows[0]
  if (window && window.reserved_kg > 0) {
    const newReserved = Math.max(0, (window.reserved_kg ?? 0) - (slot.estimated_kg ?? 0))
    const windowUpdate: Record<string, unknown> = { reserved_kg: newReserved }
    if (window.status === "full" && window.capacity_kg !== null && newReserved < window.capacity_kg) {
      windowUpdate.status = "open"
    }
    await service.updatePickupWindows({ id: window.id, ...windowUpdate })
  }

  await service.deletePickupSlots(slot.id)
  res.json({ deleted: true })
}