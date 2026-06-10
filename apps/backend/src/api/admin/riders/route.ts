import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { RIDER_MODULE } from "../../../modules/rider"
import type RiderModuleService from "../../../modules/rider/service"
import { HUB_MODULE } from "../../../modules/hub"
import type HubModuleService from "../../../modules/hub/service"
import { hashPin } from "../../../modules/rider/pin"

/**
 * GET  /admin/riders?hub_id=&status=   — list riders (optionally scoped)
 * POST /admin/riders                   — register a rider (admin only; no self-signup)
 */
export async function GET(req: MedusaRequest, res: MedusaResponse) {
  const riders: RiderModuleService = req.scope.resolve(RIDER_MODULE)

  const filters: Record<string, unknown> = {}
  if (req.query.hub_id) filters.hub_id = req.query.hub_id as string
  if (req.query.status) filters.status = req.query.status as string

  const list = await riders.listRiders(filters, {
    order: { created_at: "DESC" },
    take: 500,
  })
  res.json({ riders: list, count: list.length })
}

export async function POST(req: MedusaRequest, res: MedusaResponse) {
  const riders: RiderModuleService = req.scope.resolve(RIDER_MODULE)
  const hubs: HubModuleService = req.scope.resolve(HUB_MODULE)

  const body = (req.body ?? {}) as {
    full_name?: string
    phone?: string
    hub_id?: string
    status?: "active" | "inactive" | "suspended"
    notes?: string
    pin?: string
  }

  if (!body.full_name || !body.phone || !body.hub_id) {
    res.status(400).json({ error: "full_name, phone and hub_id are required" })
    return
  }

  const [hub] = await hubs.listHubs({ id: body.hub_id }, { take: 1 })
  if (!hub) {
    res.status(400).json({ error: "hub_id does not match a known hub" })
    return
  }

  const [existing] = await riders.listRiders(
    { phone: body.phone },
    { take: 1 }
  )
  if (existing) {
    res.status(409).json({ error: "A rider with this phone already exists." })
    return
  }

  const rider = await riders.createRiders({
    full_name: body.full_name,
    phone: body.phone,
    hub_id: body.hub_id,
    status: body.status ?? "active",
    notes: body.notes ?? null,
  })

  res.status(201).json({ rider })
}
