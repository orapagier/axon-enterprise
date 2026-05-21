import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { ContainerRegistrationKeys, Modules } from "@medusajs/framework/utils"
import { HUB_MODULE } from "../../../../../modules/hub"
import type HubModuleService from "../../../../../modules/hub/service"

/**
 * Resolve the authenticated customer's id from the auth context populated by
 * the `authenticate("customer", ...)` middleware.
 */
function getCustomerId(req: MedusaRequest): string | null {
  const ctx = (req as unknown as { auth_context?: { actor_id?: string } })
    .auth_context
  return ctx?.actor_id ?? null
}

/**
 * GET /store/customers/me/hub — return the currently linked home hub, if any.
 */
export async function GET(req: MedusaRequest, res: MedusaResponse) {
  const customerId = getCustomerId(req)
  if (!customerId) {
    res.status(401).json({ error: "Not authenticated" })
    return
  }

  const query = req.scope.resolve(ContainerRegistrationKeys.QUERY)
  const { data } = await query.graph({
    entity: "customer",
    fields: ["id", "hub.id", "hub.slug", "hub.name"],
    filters: { id: customerId },
  })

  const customer = data[0] as { hub?: { id: string; slug: string; name: string } | null } | undefined
  res.json({ hub: customer?.hub ?? null })
}

/**
 * POST /store/customers/me/hub — set or replace the customer ↔ hub link.
 * Body: { slug: string }
 */
export async function POST(req: MedusaRequest, res: MedusaResponse) {
  const customerId = getCustomerId(req)
  if (!customerId) {
    res.status(401).json({ error: "Not authenticated" })
    return
  }

  const slug = (req.body as { slug?: string } | undefined)?.slug
  if (!slug) {
    res.status(400).json({ error: "slug required" })
    return
  }

  const hubService: HubModuleService = req.scope.resolve(HUB_MODULE)
  const [hub] = await hubService.listHubs(
    { slug: slug.toLowerCase(), active: true },
    { take: 1 }
  )
  if (!hub) {
    res.status(404).json({ error: "Hub not found" })
    return
  }

  const link = req.scope.resolve(ContainerRegistrationKeys.LINK)
  const query = req.scope.resolve(ContainerRegistrationKeys.QUERY)

  // Find any existing customer↔hub link to dismiss before re-linking.
  const { data: existing } = await query.graph({
    entity: "customer",
    fields: ["id", "hub.id"],
    filters: { id: customerId },
  })
  const currentHub = (existing[0] as { hub?: { id: string } | null } | undefined)?.hub
  if (currentHub?.id) {
    await link.dismiss({
      [Modules.CUSTOMER]: { customer_id: customerId },
      [HUB_MODULE]: { hub_id: currentHub.id },
    })
  }

  await link.create({
    [Modules.CUSTOMER]: { customer_id: customerId },
    [HUB_MODULE]: { hub_id: hub.id },
  })

  res.json({ hub: { id: hub.id, slug: hub.slug, name: hub.name } })
}

/**
 * DELETE /store/customers/me/hub — clear the customer's home hub link.
 */
export async function DELETE(req: MedusaRequest, res: MedusaResponse) {
  const customerId = getCustomerId(req)
  if (!customerId) {
    res.status(401).json({ error: "Not authenticated" })
    return
  }

  const link = req.scope.resolve(ContainerRegistrationKeys.LINK)
  const query = req.scope.resolve(ContainerRegistrationKeys.QUERY)

  const { data: existing } = await query.graph({
    entity: "customer",
    fields: ["id", "hub.id"],
    filters: { id: customerId },
  })
  const currentHub = (existing[0] as { hub?: { id: string } | null } | undefined)?.hub
  if (currentHub?.id) {
    await link.dismiss({
      [Modules.CUSTOMER]: { customer_id: customerId },
      [HUB_MODULE]: { hub_id: currentHub.id },
    })
  }

  res.status(204).end()
}
