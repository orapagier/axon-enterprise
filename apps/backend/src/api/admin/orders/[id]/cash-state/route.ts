import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { getOrderCashState } from "../../../../../lib/order-cash"

/**
 * GET /admin/orders/:id/cash-state
 *
 * Reports whether the order's cash has settled (OTC paid, or COD collected +
 * remitted). This is the gate a future producer payout must check — payout
 * should require `settled: true`, not merely "delivered".
 */
export async function GET(req: MedusaRequest, res: MedusaResponse) {
  const state = await getOrderCashState(req.scope, req.params.id)
  res.json(state)
}
