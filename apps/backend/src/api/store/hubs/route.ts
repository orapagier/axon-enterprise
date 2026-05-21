import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { HUB_MODULE } from "../../../modules/hub"
import HubModuleService from "../../../modules/hub/service"

/**
 * GET /store/hubs — public list of active hubs, with their areas.
 *
 * Used by the storefront hub picker to enumerate selectable hubs.
 */
export async function GET(req: MedusaRequest, res: MedusaResponse) {
  const hubService: HubModuleService = req.scope.resolve(HUB_MODULE)
  const hubs = await hubService.listHubs(
    { active: true },
    { relations: ["areas"], take: 100 }
  )
  res.json({ hubs, count: hubs.length })
}
