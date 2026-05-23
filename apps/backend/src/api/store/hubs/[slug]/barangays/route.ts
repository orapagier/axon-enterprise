import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { DELIVERY_FEES_MODULE } from "../../../../../modules/delivery-fees"
import type DeliveryFeesModuleService from "../../../../../modules/delivery-fees/service"
import { HUB_MODULE } from "../../../../../modules/hub"
import type HubModuleService from "../../../../../modules/hub/service"

/**
 * GET /store/hubs/:slug/barangays
 *
 * Public endpoint for the storefront address-form combobox to populate the
 * searchable barangay list. Returns active barangays only.
 */
export async function GET(req: MedusaRequest, res: MedusaResponse) {
  const hubService: HubModuleService = req.scope.resolve(HUB_MODULE)
  const feesService: DeliveryFeesModuleService = req.scope.resolve(
    DELIVERY_FEES_MODULE
  )

  const [hub] = await hubService.listHubs(
    { slug: req.params.slug, active: true },
    { take: 1 }
  )
  if (!hub) {
    res.status(404).json({ error: "hub not found" })
    return
  }

  const fees = await feesService.listHubBarangayFees(
    { hub_id: hub.id, active: true },
    { order: { barangay: "ASC" }, take: 1000 }
  )

  res.json({
    hub: { id: hub.id, slug: hub.slug, name: hub.name, city: hub.city },
    barangays: fees.map((f) => f.barangay),
  })
}
