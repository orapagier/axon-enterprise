import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { RIDER_MODULE } from "../../../../modules/rider"
import type RiderModuleService from "../../../../modules/rider/service"
import { hashPin } from "../../../../modules/rider/pin"

const VALID_STATUSES = ["active", "inactive", "suspended"]

/**
 * GET   /admin/riders/:id  — read one rider
 * PATCH /admin/riders/:id  — update name/phone/hub/status/notes
 *
 * Setting status back to "active" is how an admin clears a suspension applied
 * by the rider-unremitted-tick job (after the rider has settled their cash).
 */
export async function GET(req: MedusaRequest, res: MedusaResponse) {
  const riders: RiderModuleService = req.scope.resolve(RIDER_MODULE)
  const [rider] = await riders.listRiders({ id: req.params.id }, { take: 1 })
  if (!rider) {
    res.status(404).json({ error: "Rider not found" })
    return
  }
  // Never echo the pin/hash back.
  res.json({ rider: { ...rider, pin_hash: undefined } })
}

export async function POST(req: MedusaRequest, res: MedusaResponse) {
  return PATCH(req, res)
}

export async function PATCH(req: MedusaRequest, res: MedusaResponse) {
  const riders: RiderModuleService = req.scope.resolve(RIDER_MODULE)
  const id = req.params.id

  const [rider] = await riders.listRiders({ id }, { take: 1 })
  if (!rider) {
    res.status(404).json({ error: "Rider not found" })
    return
  }

  const body = (req.body ?? {}) as {
    full_name?: string
    phone?: string
    hub_id?: string
    status?: string
    notes?: string | null
    pin?: string
  }

  const update: Record<string, unknown> = { id }
  if (body.full_name !== undefined) update.full_name = body.full_name
  if (body.phone !== undefined) update.phone = body.phone
  if (body.hub_id !== undefined) update.hub_id = body.hub_id
  if (body.notes !== undefined) update.notes = body.notes
  if (body.pin !== undefined) update.pin_hash = body.pin ? hashPin(body.pin) : null
  if (body.status !== undefined) {
    if (!VALID_STATUSES.includes(body.status)) {
      res.status(400).json({ error: "Invalid status" })
      return
    }
    update.status = body.status
  }

  const updated = await riders.updateRiders(update)
  res.json({ rider: { ...updated, pin_hash: undefined } })
}
