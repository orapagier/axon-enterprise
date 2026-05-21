import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { HUB_MODULE } from "../../../../modules/hub"
import HubModuleService from "../../../../modules/hub/service"

/**
 * GET /admin/hubs/:id — retrieve a hub with its areas
 */
export async function GET(req: MedusaRequest, res: MedusaResponse) {
  const hubService: HubModuleService = req.scope.resolve(HUB_MODULE)
  const hub = await hubService.retrieveHub(req.params.id, {
    relations: ["areas"],
  })
  res.json({ hub })
}

/**
 * PATCH /admin/hubs/:id — update mutable hub fields
 */
export async function PATCH(req: MedusaRequest, res: MedusaResponse) {
  const hubService: HubModuleService = req.scope.resolve(HUB_MODULE)

  const body = (req.body ?? {}) as {
    name?: string
    slug?: string
    city?: string
    province?: string
    country?: string
    active?: boolean
    dispatch_cutoff?: string
    dispatch_time?: string
    timezone?: string
  }

  if (body.slug) {
    const collisions = await hubService.listHubs({ slug: body.slug.toLowerCase() })
    const conflicts = collisions.find((h) => h.id !== req.params.id)
    if (conflicts) {
      res.status(409).json({ error: `Hub with slug "${body.slug}" already exists` })
      return
    }
  }

  const hub = await hubService.updateHubs({
    id: req.params.id,
    ...body,
    ...(body.slug ? { slug: body.slug.toLowerCase() } : {}),
    ...(body.country ? { country: body.country.toLowerCase() } : {}),
  })

  res.json({ hub })
}

/**
 * DELETE /admin/hubs/:id — soft delete the hub (and cascade areas).
 */
export async function DELETE(req: MedusaRequest, res: MedusaResponse) {
  const hubService: HubModuleService = req.scope.resolve(HUB_MODULE)
  await hubService.deleteHubs(req.params.id)
  res.status(204).end()
}
