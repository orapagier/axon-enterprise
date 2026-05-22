import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { DISPATCH_MODULE } from "../../../../modules/dispatch"
import type DispatchModuleService from "../../../../modules/dispatch/service"
import { HUB_MODULE } from "../../../../modules/hub"
import type HubModuleService from "../../../../modules/hub/service"

/**
 * GET /admin/dispatch/batches
 * Query: hub, status, date (YYYY-MM-DD, treated as local Manila date)
 *
 * Returns batches with order_count + hub summary so the admin UI can render
 * one row per hub for today.
 */
export async function GET(req: MedusaRequest, res: MedusaResponse) {
  const service: DispatchModuleService = req.scope.resolve(DISPATCH_MODULE)
  const hubService: HubModuleService = req.scope.resolve(HUB_MODULE)

  const filters: Record<string, unknown> = {}
  if (req.query.hub) filters.hub_id = req.query.hub as string
  if (req.query.status) filters.status = req.query.status as string
  if (req.query.date) {
    // Treat input as Manila-local calendar day → store as UTC midnight of that day.
    const d = new Date(`${req.query.date}T00:00:00Z`)
    filters.dispatch_date = d
  }

  const batches = await service.listDispatchBatches(filters, {
    order: { dispatch_date: "DESC" },
    take: 200,
  })

  const hubIds = Array.from(new Set(batches.map((b) => b.hub_id)))
  const hubs = hubIds.length
    ? await hubService.listHubs({ id: hubIds }, { take: hubIds.length })
    : []
  const hubById = new Map(hubs.map((h) => [h.id, h]))

  const enriched = await Promise.all(
    batches.map(async (b) => {
      const orders = await service.listDispatchOrders(
        { dispatch_batch_id: b.id },
        { take: 500 }
      )
      const hub = hubById.get(b.hub_id)
      return {
        ...b,
        order_count: orders.length,
        hub: hub
          ? { id: hub.id, name: hub.name, slug: hub.slug }
          : null,
      }
    })
  )

  res.json({ batches: enriched, count: enriched.length })
}
