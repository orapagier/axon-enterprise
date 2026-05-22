import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { DISPATCH_MODULE } from "../../../../../modules/dispatch"
import type DispatchModuleService from "../../../../../modules/dispatch/service"

const VALID_TRANSITIONS: Record<string, string[]> = {
  collecting: ["locked"],
  locked: ["in_transit"],
  in_transit: ["completed"],
  completed: [],
}

/**
 * GET /admin/dispatch/batches/:id — full batch with its orders.
 */
export async function GET(req: MedusaRequest, res: MedusaResponse) {
  const service: DispatchModuleService = req.scope.resolve(DISPATCH_MODULE)
  const id = req.params.id

  const [batch] = await service.listDispatchBatches({ id }, { take: 1 })
  if (!batch) {
    res.status(404).json({ error: "Batch not found" })
    return
  }
  const orders = await service.listDispatchOrders(
    { dispatch_batch_id: id },
    { order: { manifest_position: "ASC" }, take: 500 }
  )
  res.json({ batch, orders })
}

/**
 * PATCH /admin/dispatch/batches/:id — transition status (manual override).
 * Body: { status: "collecting" | "locked" | "in_transit" | "completed" }
 */
export async function PATCH(req: MedusaRequest, res: MedusaResponse) {
  const service: DispatchModuleService = req.scope.resolve(DISPATCH_MODULE)
  const id = req.params.id
  const body = req.body as { status?: string }

  const [batch] = await service.listDispatchBatches({ id }, { take: 1 })
  if (!batch) {
    res.status(404).json({ error: "Batch not found" })
    return
  }
  if (!body.status) {
    res.status(400).json({ error: "status required" })
    return
  }
  const allowed = VALID_TRANSITIONS[batch.status] ?? []
  if (!allowed.includes(body.status)) {
    res.status(400).json({
      error: `Cannot transition from ${batch.status} to ${body.status}`,
    })
    return
  }

  const update: Record<string, unknown> = { id, status: body.status }
  if (body.status === "in_transit") {
    update.dispatched_at = new Date()
  }

  const updated = await service.updateDispatchBatches(update)
  res.json({ batch: updated })
}
