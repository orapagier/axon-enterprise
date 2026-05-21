import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { PICKUP_MODULE } from "../../../../modules/pickup"
import PickupModuleService from "../../../../modules/pickup/service"
import {
  validateWindowCreate,
  validateWindowStatusTransition,
} from "../../../../modules/pickup/validators"

/**
 * GET /admin/pickup-windows/:id
 */
export async function GET(req: MedusaRequest, res: MedusaResponse) {
  const service: PickupModuleService = req.scope.resolve(PICKUP_MODULE)
  const windows = await service.listPickupWindows(
    { id: req.params.id },
    { take: 1 }
  )
  if (!windows.length) {
    res.status(404).json({ error: "Pickup window not found." })
    return
  }

  const window = windows[0]
  const slots = await service.listPickupSlots(
    { pickup_window_id: window.id },
    { take: 500 }
  )

  res.json({ window: { ...window, slots_count: slots.length } })
}

/**
 * PATCH /admin/pickup-windows/:id
 * Fields: status?, capacity_kg?, start_time?, end_time?
 * Editing start_time/end_time only allowed while status=open and slots=0.
 */
export async function PATCH(req: MedusaRequest, res: MedusaResponse) {
  const service: PickupModuleService = req.scope.resolve(PICKUP_MODULE)
  const windows = await service.listPickupWindows(
    { id: req.params.id },
    { take: 1 }
  )
  if (!windows.length) {
    res.status(404).json({ error: "Pickup window not found." })
    return
  }
  const window = windows[0]
  const body = req.body as {
    status?: string
    capacity_kg?: number | null
    start_time?: string
    end_time?: string
  }

  const update: Record<string, unknown> = {}

  // Status transition
  if (body.status && body.status !== window.status) {
    const transition = validateWindowStatusTransition(
      window.status as "open" | "full" | "closed" | "completed",
      body.status as "open" | "full" | "closed" | "completed",
      true // isAdmin
    )
    if (!transition.ok) {
      res.status(400).json({
        error: transition.errors[0].message,
        code: transition.errors[0].code,
      })
      return
    }
    update.status = body.status
  }

  // Capacity edit
  if (body.capacity_kg !== undefined) {
    update.capacity_kg = body.capacity_kg
  }

  // Time edits — only if open and no slots
  if (body.start_time || body.end_time) {
    if (window.status !== "open") {
      res.status(400).json({
        error: "Time can only be edited while the window is open.",
        code: "TIME_EDIT_CLOSED",
      })
      return
    }
    const slots = await service.listPickupSlots(
      { pickup_window_id: window.id },
      { take: 1 }
    )
    if (slots.length) {
      res.status(400).json({
        error: "Time cannot be edited once slots are reserved.",
        code: "TIME_EDIT_HAS_SLOTS",
      })
      return
    }

    const winDate = window.date as unknown
    const dateIso =
      typeof winDate === "string"
        ? winDate
        : (winDate as Date | null | undefined)?.toISOString?.() ?? ""
    const validate = validateWindowCreate({
      start_time: body.start_time ?? window.start_time,
      end_time: body.end_time ?? window.end_time,
      date: dateIso.slice(0, 10),
    })
    if (!validate.ok) {
      res.status(400).json({
        error: validate.errors[0].message,
        code: validate.errors[0].code,
      })
      return
    }
    if (body.start_time) update.start_time = body.start_time
    if (body.end_time) update.end_time = body.end_time
  }

  if (Object.keys(update).length === 0) {
    res.json({ window })
    return
  }

  await service.updatePickupWindows({
    id: window.id,
    ...update,
  })

  const refreshed = (await service.listPickupWindows({ id: window.id }, { take: 1 }))[0]
  res.json({ window: refreshed })
}

/**
 * DELETE /admin/pickup-windows/:id — only if no slots exist.
 */
export async function DELETE(req: MedusaRequest, res: MedusaResponse) {
  const service: PickupModuleService = req.scope.resolve(PICKUP_MODULE)
  const windows = await service.listPickupWindows(
    { id: req.params.id },
    { take: 1 }
  )
  if (!windows.length) {
    res.status(404).json({ error: "Pickup window not found." })
    return
  }
  const window = windows[0]

  const slots = await service.listPickupSlots(
    { pickup_window_id: window.id },
    { take: 1 }
  )
  if (slots.length) {
    res.status(400).json({
      error: "Cannot delete a window that has reserved slots.",
      code: "HAS_SLOTS",
    })
    return
  }

  await service.deletePickupWindows(window.id)
  res.json({ deleted: true })
}