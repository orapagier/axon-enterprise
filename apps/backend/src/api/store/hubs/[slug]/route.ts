import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { HUB_MODULE } from "../../../../modules/hub"
import HubModuleService from "../../../../modules/hub/service"

/**
 * GET /store/hubs/:slug — public detail for a single active hub.
 */
export async function GET(req: MedusaRequest, res: MedusaResponse) {
  const hubService: HubModuleService = req.scope.resolve(HUB_MODULE)
  const [hub] = await hubService.listHubs(
    { slug: req.params.slug, active: true },
    { relations: ["areas"], take: 1 }
  )
  if (!hub) {
    res.status(404).json({ error: "Hub not found" })
    return
  }
  res.json({ hub })
}
