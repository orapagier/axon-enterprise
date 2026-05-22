import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { ACCOUNTABILITY_MODULE } from "../../../../../../modules/accountability"
import type AccountabilityModuleService from "../../../../../../modules/accountability/service"

function getCustomerId(req: MedusaRequest): string | null {
  const ctx = (req as unknown as { auth_context?: { actor_id?: string } })
    .auth_context
  return ctx?.actor_id ?? null
}

const VALID_REASONS = ["damaged_goods", "wrong_item", "not_home", "other"]
const RESPONSE_WINDOW_MS = 48 * 60 * 60 * 1000

/**
 * POST /store/customer/disputes/:id/respond
 * Body: { buyer_reason, buyer_notes? }
 *
 * Buyer adds their side of the story. Must respond within 48h of dispute
 * creation. Once resolved by admin the dispute is locked.
 */
export async function POST(req: MedusaRequest, res: MedusaResponse) {
  const customerId = getCustomerId(req)
  if (!customerId) {
    res.status(401).json({ error: "Not authenticated" })
    return
  }
  const body = req.body as { buyer_reason?: string; buyer_notes?: string }
  if (!body.buyer_reason || !VALID_REASONS.includes(body.buyer_reason)) {
    res.status(400).json({
      error: `buyer_reason must be one of ${VALID_REASONS.join(", ")}`,
    })
    return
  }
  const accountability: AccountabilityModuleService = req.scope.resolve(
    ACCOUNTABILITY_MODULE
  )

  const [dispute] = await accountability.listRefusalDisputes(
    { id: req.params.id },
    { take: 1 }
  )
  if (!dispute || dispute.customer_id !== customerId) {
    res.status(404).json({ error: "Dispute not found" })
    return
  }
  if (dispute.resolution !== "pending") {
    res.status(409).json({ error: "Dispute already resolved" })
    return
  }
  const createdAt =
    typeof dispute.created_at === "string"
      ? new Date(dispute.created_at)
      : dispute.created_at
  if (Date.now() - createdAt.getTime() > RESPONSE_WINDOW_MS) {
    res.status(409).json({ error: "48-hour response window has passed" })
    return
  }

  const updated = await accountability.updateRefusalDisputes({
    id: dispute.id,
    buyer_reason: body.buyer_reason as
      | "damaged_goods"
      | "wrong_item"
      | "not_home"
      | "other",
    buyer_notes: body.buyer_notes ?? null,
    buyer_responded_at: new Date(),
  })
  res.json({ dispute: updated })
}
