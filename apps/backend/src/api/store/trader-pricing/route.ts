import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { Modules } from "@medusajs/framework/utils"
import { isTraderAccount } from "../../../lib/trader"

/**
 * GET /store/trader-pricing — the logged-in customer's trader pricing state.
 *
 * The discount itself is applied server-side by the automatic TRADER-<pct>
 * promotion during cart operations; this endpoint exists so the storefront can
 * render "your price" on product pages (display only — never trusted for
 * money) and surface the negotiated minimum-order note.
 */
export async function GET(req: MedusaRequest, res: MedusaResponse) {
  const customerId =
    (req as unknown as { auth_context?: { actor_id?: string } }).auth_context
      ?.actor_id ?? null
  if (!customerId) {
    res.status(401).json({ error: "Not authenticated" })
    return
  }

  const customerModule = req.scope.resolve(Modules.CUSTOMER)
  const customer = await customerModule.retrieveCustomer(customerId, {
    select: ["id", "metadata"],
  })
  const meta = (customer?.metadata as Record<string, unknown> | null) ?? {}

  const isTrader = isTraderAccount(meta)
  const approved = isTrader && meta.trader_approved === true
  res.json({
    is_trader: isTrader,
    approved,
    discount_percent: approved ? (meta.trader_discount_percent ?? null) : null,
    min_order_note: approved ? (meta.trader_min_order_note ?? null) : null,
  })
}
