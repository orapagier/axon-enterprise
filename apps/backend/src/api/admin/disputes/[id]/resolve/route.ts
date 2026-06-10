import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"
import resolveDisputeWorkflow from "../../../../../workflows/resolve-dispute"
import { sendEmail } from "../../../../../lib/notify"

const VALID_RESOLUTIONS = [
  "buyer_fault",
  "producer_fault",
  "rider_fault",
  "platform_fault",
]

/**
 * POST /admin/disputes/:id/resolve
 * Body: { resolution, resolution_notes? }
 *
 * Runs the resolve-dispute workflow which applies the buyer strike on buyer_fault.
 */
export async function POST(req: MedusaRequest, res: MedusaResponse) {
  const body = req.body as {
    resolution?: string
    resolution_notes?: string
  }
  if (!body.resolution || !VALID_RESOLUTIONS.includes(body.resolution)) {
    res.status(400).json({
      error: `resolution must be one of ${VALID_RESOLUTIONS.join(", ")}`,
    })
    return
  }

  const actorId =
    (req as unknown as { auth_context?: { actor_id?: string } }).auth_context
      ?.actor_id ?? null

  try {
    const { result } = await resolveDisputeWorkflow(req.scope).run({
      input: {
        dispute_id: req.params.id,
        resolution: body.resolution as
          | "buyer_fault"
          | "producer_fault"
          | "rider_fault"
          | "platform_fault",
        resolution_notes: body.resolution_notes,
        resolved_by: actorId,
      },
    })
    // Phase B — tell the buyer how it ended (best-effort).
    const query = req.scope.resolve(ContainerRegistrationKeys.QUERY)
    const { data: orderRows } = await query.graph({
      entity: "order",
      fields: ["id", "display_id", "email"],
      filters: { id: (result as { order_id: string }).order_id },
    })
    const order = orderRows[0] as unknown as
      | { display_id: number; email: string | null }
      | undefined
    if (order) {
      await sendEmail(req.scope, {
        to: order.email,
        template: "dispute-resolved",
        data: { display_id: order.display_id, resolution: body.resolution },
      })
    }

    res.json({ dispute: result })
  } catch (err) {
    const msg = (err as Error).message
    if (msg.includes("not found")) {
      res.status(404).json({ error: msg })
      return
    }
    if (msg.includes("already resolved")) {
      res.status(409).json({ error: msg })
      return
    }
    res.status(500).json({ error: msg })
  }
}
