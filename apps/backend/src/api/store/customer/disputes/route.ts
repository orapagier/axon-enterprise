import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { ACCOUNTABILITY_MODULE } from "../../../../modules/accountability"
import type AccountabilityModuleService from "../../../../modules/accountability/service"
import { canAppeal } from "../../../../lib/dispute-appeal"

function getCustomerId(req: MedusaRequest): string | null {
  const ctx = (req as unknown as { auth_context?: { actor_id?: string } })
    .auth_context
  return ctx?.actor_id ?? null
}

/**
 * GET /store/customer/disputes — list this customer's disputes.
 *
 * Each dispute carries `appeal_eligible` (computed from the shared appeal rule)
 * so the storefront can show the "Appeal" affordance without re-deriving the
 * window client-side.
 */
export async function GET(req: MedusaRequest, res: MedusaResponse) {
  const customerId = getCustomerId(req)
  if (!customerId) {
    res.status(401).json({ error: "Not authenticated" })
    return
  }
  const accountability: AccountabilityModuleService = req.scope.resolve(
    ACCOUNTABILITY_MODULE
  )
  const disputes = await accountability.listRefusalDisputes(
    { customer_id: customerId },
    { order: { created_at: "DESC" }, take: 50 }
  )
  const now = new Date()
  const enriched = disputes.map((d) => ({
    ...d,
    appeal_eligible: canAppeal(
      {
        resolution: d.resolution,
        appeal_state: d.appeal_state,
        resolved_at: d.resolved_at,
      },
      now
    ),
  }))
  const [status] = await accountability.listBuyerAccountStatuses(
    { customer_id: customerId },
    { take: 1 }
  )
  res.json({ disputes: enriched, account_status: status ?? null })
}
