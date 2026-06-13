import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"
import appealDisputeWorkflow from "../../../../../workflows/appeal-dispute"
import { sendEmail } from "../../../../../lib/notify"

const VALID_DECISIONS = ["uphold", "overturn"]

/**
 * POST /admin/disputes/:id/appeal
 * Body: { decision: "uphold" | "overturn", notes? }
 *
 * Adjudicate a buyer's appeal. "overturn" reverses the strike the original
 * buyer_fault resolution applied; "uphold" lets it stand.
 */
export async function POST(req: MedusaRequest, res: MedusaResponse) {
  const body = req.body as { decision?: string; notes?: string }
  if (!body.decision || !VALID_DECISIONS.includes(body.decision)) {
    res.status(400).json({
      error: `decision must be one of ${VALID_DECISIONS.join(", ")}`,
    })
    return
  }

  const actorId =
    (req as unknown as { auth_context?: { actor_id?: string } }).auth_context
      ?.actor_id ?? null

  try {
    const { result } = await appealDisputeWorkflow(req.scope).run({
      input: {
        dispute_id: req.params.id,
        decision: body.decision as "uphold" | "overturn",
        notes: body.notes,
        resolved_by: actorId,
      },
    })

    // Tell the buyer the outcome (best-effort).
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
        template: "dispute-appeal-resolved",
        data: { display_id: order.display_id, decision: body.decision },
      })
    }

    res.json({ dispute: result })
  } catch (err) {
    const msg = (err as Error).message
    if (msg.includes("not found")) {
      res.status(404).json({ error: msg })
      return
    }
    if (msg.includes("not a buyer_fault") || msg.includes("no pending appeal")) {
      res.status(409).json({ error: msg })
      return
    }
    res.status(500).json({ error: msg })
  }
}
