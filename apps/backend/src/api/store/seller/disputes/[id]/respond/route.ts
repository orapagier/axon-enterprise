import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { ACCOUNTABILITY_MODULE } from "../../../../../../modules/accountability"
import type AccountabilityModuleService from "../../../../../../modules/accountability/service"

const RESPONSE_WINDOW_MS = 48 * 60 * 60 * 1000

/**
 * POST /store/seller/disputes/:id/respond
 * Body: { producer_response }
 *
 * The producer adds a rebuttal. The seller-auth middleware already enforces
 * that the requester is a logged-in producer; we don't tie the dispute to a
 * specific producer id here (day-1 simplification).
 */
export async function POST(req: MedusaRequest, res: MedusaResponse) {
  const body = req.body as { producer_response?: string }
  if (!body.producer_response?.trim()) {
    res.status(400).json({ error: "producer_response required" })
    return
  }
  const accountability: AccountabilityModuleService = req.scope.resolve(
    ACCOUNTABILITY_MODULE
  )

  const [dispute] = await accountability.listRefusalDisputes(
    { id: req.params.id },
    { take: 1 }
  )
  if (!dispute) {
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
    producer_response: body.producer_response.trim(),
    producer_responded_at: new Date(),
  })
  res.json({ dispute: updated })
}
