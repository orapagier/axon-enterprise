import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"
import { PICKUP_MODULE } from "../../../modules/pickup"
import PickupModuleService from "../../../modules/pickup/service"
import { HUB_MODULE } from "../../../modules/hub"
import HubModuleService from "../../../modules/hub/service"
import {
  validateWindowCreate,
  validateWindowStatusTransition,
} from "../../../modules/pickup/validators"

/**
 * GET /admin/pickup-windows
 * Query: hub, hub_area, from, to, status
 */
export async function GET(req: MedusaRequest, res: MedusaResponse) {
  const service: PickupModuleService = req.scope.resolve(PICKUP_MODULE)
  const query = req.scope.resolve(ContainerRegistrationKeys.QUERY)

  const filters: Record<string, unknown> = {}

  if (req.query.hub) {
    filters.hub_id = req.query.hub as string
  }
  if (req.query.hub_area) {
    filters.hub_area_id = req.query.hub_area as string
  }
  if (req.query.status) {
    filters.status = req.query.status as string
  }

  const windows = await service.listPickupWindows(filters, {
    order: { date: "ASC", start_time: "ASC" },
    take: 200,
  })

  // Enrich with slots_count
  const enriched = await Promise.all(
    windows.map(async (w) => {
      const slots = await service.listPickupSlots(
        { pickup_window_id: w.id },
        { take: 500 }
      )
      return {
        ...w,
        slots_count: slots.length,
      }
    })
  )

  res.json({ windows: enriched, count: enriched.length })
}

/**
 * POST /admin/pickup-windows
 */
export async function POST(req: MedusaRequest, res: MedusaResponse) {
  const service: PickupModuleService = req.scope.resolve(PICKUP_MODULE)
  const hubService: HubModuleService = req.scope.resolve(HUB_MODULE)

  const body = req.body as {
    hub_area_id?: string
    date?: string
    start_time?: string
    end_time?: string
    capacity_kg?: number | null
  }

  // Validate required fields
  if (!body.hub_area_id || !body.date || !body.start_time || !body.end_time) {
    res.status(400).json({
      error: "hub_area_id, date, start_time, and end_time are required.",
    })
    return
  }

  // Validate hub_area exists
  const areas = await hubService.listHubAreas(
    { id: body.hub_area_id },
    { take: 1 }
  )
  if (!areas.length) {
    res.status(400).json({
      error: "Hub area not found.",
      code: "HUB_AREA_NOT_FOUND",
    })
    return
  }
  const area = areas[0]

  // Validate window create
  const validation = validateWindowCreate({
    start_time: body.start_time,
    end_time: body.end_time,
    date: body.date,
  })
  if (!validation.ok) {
    res.status(400).json({
      error: validation.errors[0].message,
      code: validation.errors[0].code,
      fieldErrors: validation.errors,
    })
    return
  }

  // Check for duplicate (same area, date, start_time). MikroORM's date
  // equality against a string is unreliable since the column is dateTime —
  // pull windows for the area+start_time and compare YYYY-MM-DD in memory.
  const sameSlot = await service.listPickupWindows(
    {
      hub_area_id: body.hub_area_id,
      start_time: body.start_time,
    },
    { take: 1000 }
  )
  const wanted = body.date.slice(0, 10)
  const collision = sameSlot.find((w) => {
    const iso =
      typeof w.date === "string"
        ? w.date
        : new Date(w.date).toISOString()
    return iso.slice(0, 10) === wanted
  })
  if (collision) {
    res.status(409).json({
      error: "A pickup window already exists for this area, date, and start time.",
      code: "DUPLICATE_WINDOW",
    })
    return
  }

  const window = await service.createPickupWindows({
    hub_id: area.hub_id as string,
    hub_area_id: body.hub_area_id,
    date: new Date(body.date),
    start_time: body.start_time,
    end_time: body.end_time,
    capacity_kg: body.capacity_kg ?? null,
    status: "open",
  })

  res.status(201).json({ window })
}