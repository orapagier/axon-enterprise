import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { HUB_MODULE } from "../../../../../../modules/hub"
import HubModuleService from "../../../../../../modules/hub/service"

/**
 * PATCH /admin/hubs/:id/areas/:areaId — update area fields
 */
export async function PATCH(req: MedusaRequest, res: MedusaResponse) {
  const hubService: HubModuleService = req.scope.resolve(HUB_MODULE)

  const body = (req.body ?? {}) as {
    name?: string
    postal_codes?: string[]
    barangays?: string[]
    pickup_day_of_week?: number[] | null
  }

  const patch: Record<string, unknown> = {}
  if (typeof body.name === "string") patch.name = body.name
  if (Array.isArray(body.postal_codes)) patch.postal_codes = body.postal_codes
  if (Array.isArray(body.barangays)) patch.barangays = body.barangays
  if (body.pickup_day_of_week !== undefined) {
    patch.pickup_day_of_week = body.pickup_day_of_week
  }

  const area = await hubService.updateHubAreas(
    {
      selector: { id: req.params.areaId },
      data: patch,
    } as unknown as Parameters<typeof hubService.updateHubAreas>[0]
  )

  res.json({ area })
}

/**
 * DELETE /admin/hubs/:id/areas/:areaId — remove the area
 */
export async function DELETE(req: MedusaRequest, res: MedusaResponse) {
  const hubService: HubModuleService = req.scope.resolve(HUB_MODULE)
  await hubService.deleteHubAreas(req.params.areaId)
  res.status(204).end()
}
