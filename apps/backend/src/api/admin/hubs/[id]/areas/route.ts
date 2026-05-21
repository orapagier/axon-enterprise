import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { HUB_MODULE } from "../../../../../modules/hub"
import HubModuleService from "../../../../../modules/hub/service"

/**
 * GET /admin/hubs/:id/areas — list areas belonging to a hub
 */
export async function GET(req: MedusaRequest, res: MedusaResponse) {
  const hubService: HubModuleService = req.scope.resolve(HUB_MODULE)
  const areas = await hubService.listHubAreas(
    { hub_id: req.params.id },
    { take: 100 }
  )
  res.json({ areas, count: areas.length })
}

/**
 * POST /admin/hubs/:id/areas — create a new area under a hub
 */
export async function POST(req: MedusaRequest, res: MedusaResponse) {
  const hubService: HubModuleService = req.scope.resolve(HUB_MODULE)

  const body = (req.body ?? {}) as {
    name?: string
    postal_codes?: string[]
    barangays?: string[]
    pickup_day_of_week?: number[] | null
  }

  if (!body.name) {
    res.status(400).json({ error: "name is required" })
    return
  }

  // Ensure the hub exists before attaching an area.
  await hubService.retrieveHub(req.params.id)

  const area = await hubService.createHubAreas({
    hub_id: req.params.id,
    name: body.name,
    postal_codes: (body.postal_codes ?? []) as unknown as Record<string, unknown>,
    barangays: (body.barangays ?? []) as unknown as Record<string, unknown>,
    pickup_day_of_week: (body.pickup_day_of_week ?? null) as unknown as Record<string, unknown> | null,
  })

  res.status(201).json({ area })
}
