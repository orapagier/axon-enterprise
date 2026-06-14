import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"
import { ACCOUNTABILITY_MODULE } from "../../../../../../modules/accountability"
import type AccountabilityModuleService from "../../../../../../modules/accountability/service"
import { evaluateAppealEligibility } from "../../../../../../lib/dispute-appeal"
import { sendEmail } from "../../../../../../lib/notify"
import { notifyAdmin } from "../../../../../../lib/notify-admin"

function getCustomerId(req: MedusaRequest): string | null {
  const ctx = (req as unknown as { auth_context?: { actor_id?: string } })
    .auth_context
  return ctx?.actor_id ?? null
}

const REASON_STATUS: Record<string, number> = {
  not_buyer_fault: 409,
  already_appealed: 409,
  window_passed: 409,
}

const REASON_MESSAGE: Record<string, string> = {
  not_buyer_fault: "Only buyer-fault decisions can be appealed.",
  already_appealed: "This dispute has already been appealed.",
  window_passed: "The 14-day appeal window has passed.",
}

/**
 * POST /store/customer/disputes/:id/appeal
 * Body: { notes }
 *
 * The buyer contests a buyer_fault strike within the appeal window. Moves the
 * dispute to appeal_state="requested" for admin review; the strike is only
 * lifted if an admin overturns it.
 */
export async function POST(req: MedusaRequest, res: MedusaResponse) {
  const customerId = getCustomerId(req)
  if (!customerId) {
    res.status(401).json({ error: "Not authenticated" })
    return
  }
  const body = req.body as { notes?: string }
  const notes = body.notes?.trim()
  if (!notes) {
    res.status(400).json({ error: "Tell us why you're appealing (notes required)." })
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

  const eligibility = evaluateAppealEligibility(
    {
      resolution: dispute.resolution,
      appeal_state: dispute.appeal_state,
      resolved_at: dispute.resolved_at,
    },
    new Date()
  )
  if (!eligibility.ok) {
    res
      .status(REASON_STATUS[eligibility.reason] ?? 409)
      .json({ error: REASON_MESSAGE[eligibility.reason] })
    return
  }

  const updated = await accountability.updateRefusalDisputes({
    id: dispute.id,
    appeal_state: "requested",
    appeal_notes: notes,
    appeal_requested_at: new Date(),
  })

  // Acknowledge to the buyer (best-effort).
  const query = req.scope.resolve(ContainerRegistrationKeys.QUERY)
  const { data: orderRows } = await query.graph({
    entity: "order",
    fields: ["id", "display_id", "email"],
    filters: { id: dispute.order_id },
  })
  const order = orderRows[0] as unknown as
    | { display_id: number; email: string | null }
    | undefined
  if (order) {
    await sendEmail(req.scope, {
      to: order.email,
      template: "dispute-appeal-received",
      data: { display_id: order.display_id },
    })
  }

  res.json({ dispute: updated })
}
