import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"
import { HUB_MODULE } from "../../../../../modules/hub"
import type HubModuleService from "../../../../../modules/hub/service"

/**
 * GET /store/hubs/:slug/products — return the list of product IDs linked to a hub.
 *
 * The storefront filters its product grid using these IDs (rather than adding
 * a hub-aware wrapper around `/store/products`) so we don't have to touch the
 * core product list route. Returns just IDs — the storefront fetches full
 * product detail through the standard `/store/products` route.
 */
export async function GET(req: MedusaRequest, res: MedusaResponse) {
  const hubService: HubModuleService = req.scope.resolve(HUB_MODULE)
  const [hub] = await hubService.listHubs(
    { slug: req.params.slug, active: true },
    { take: 1 }
  )
  if (!hub) {
    res.status(404).json({ error: "Hub not found" })
    return
  }

  const query = req.scope.resolve(ContainerRegistrationKeys.QUERY)
  const { data } = await query.graph({
    entity: "hub",
    fields: ["id", "product.id"],
    filters: { id: hub.id },
  })

  const products = (data[0] as { product?: { id: string }[] } | undefined)?.product ?? []
  res.json({
    hub_id: hub.id,
    slug: hub.slug,
    product_ids: products.map((p) => p.id),
  })
}
