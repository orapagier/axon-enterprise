import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { ContainerRegistrationKeys, Modules } from "@medusajs/framework/utils"
import { PICKUP_MODULE } from "../../../../modules/pickup"
import PickupModuleService from "../../../../modules/pickup/service"
import { HUB_MODULE } from "../../../../modules/hub"

/**
 * GET /store/seller/pickup-windows?from=&to=&limit=5
 *
 * Returns open windows in the authenticated producer's hub area.
 * Used by the storefront listing form to populate the pickup window select.
 */
export async function GET(req: MedusaRequest, res: MedusaResponse) {
  // Auth already enforced by middlewares — get the customer
  const customerId = (req as unknown as { auth_context?: { actor_id?: string } })
    .auth_context?.actor_id
  if (!customerId) {
    res.status(401).json({ error: "Not authenticated." })
    return
  }

  const query = req.scope.resolve(ContainerRegistrationKeys.QUERY)

  // Find producer's hub area
  const { data: customerData } = await query.graph({
    entity: "customer",
    fields: ["id", "hub.id", "hub.areas.id"],
    filters: { id: customerId },
  })

  const customer = customerData?.[0] as {
    hub?: { id?: string; areas?: Array<{ id: string }> }
  } | undefined

  if (!customer?.hub?.id) {
    res.status(400).json({
      error: "You must be assigned to a hub before listing products.",
      code: "NO_HUB_ASSIGNED",
    })
    return
  }

  const hubAreaIds = (customer.hub.areas ?? []).map((a) => a.id)
  if (!hubAreaIds.length) {
    res.json({ windows: [], count: 0 })
    return
  }

  const service: PickupModuleService = req.scope.resolve(PICKUP_MODULE)

  const filters: Record<string, unknown> = {
    hub_area_id: hubAreaIds,
    status: "open",
  }

  const from = req.query.from as string | undefined
  const to = req.query.to as string | undefined

  const windows = await service.listPickupWindows(filters, {
    order: { date: "ASC", start_time: "ASC" },
    take: 200,
  })

  // Filter by date range in memory and limit
  const isoDay = (d: unknown): string => {
    if (typeof d === "string") return d.slice(0, 10)
    if (d instanceof Date) return d.toISOString().slice(0, 10)
    return new Date(d as string | number | Date).toISOString().slice(0, 10)
  }

  let filtered = windows
  if (from) {
    filtered = filtered.filter((w) => isoDay(w.date) >= from)
  }
  if (to) {
    filtered = filtered.filter((w) => isoDay(w.date) <= to)
  }

  const limit = typeof req.query.limit === "string" ? parseInt(req.query.limit, 10) : 5
  const slice = filtered.slice(0, Math.min(limit, 50))

  res.json({ windows: slice, count: slice.length })
}