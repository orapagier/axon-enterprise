import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { ACCOUNTABILITY_MODULE } from "../../../../modules/accountability"
import type AccountabilityModuleService from "../../../../modules/accountability/service"

function getCustomerId(req: MedusaRequest): string | null {
  const ctx = (req as unknown as { auth_context?: { actor_id?: string } })
    .auth_context
  return ctx?.actor_id ?? null
}

/**
 * GET /store/customer/disputes — list this customer's disputes.
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
  const [status] = await accountability.listBuyerAccountStatuses(
    { customer_id: customerId },
    { take: 1 }
  )
  res.json({ disputes, account_status: status ?? null })
}
