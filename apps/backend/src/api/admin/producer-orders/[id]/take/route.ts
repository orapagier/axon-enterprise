import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { applyAdminTake } from "../../../../../lib/producer-confirm"
import {
  getSellerEntry,
  persistConfirmEntry,
  recordProducerStrike,
  loadOrderForConfirm,
  notifyResolution,
} from "../../../../../lib/producer-confirm-store"

/**
 * POST /admin/producer-orders/:id/take
 * Body: { seller_id }
 *
 * The hub takes over fulfilment of a producer's unconfirmed items. The order
 * stays alive (the hub sources + delivers); the producer still gets a strike
 * for the no-show, and the buyer is told the hub has it.
 */
export async function POST(req: MedusaRequest, res: MedusaResponse) {
  const orderId = req.params.id
  const sellerId = ((req.body ?? {}) as { seller_id?: string }).seller_id
  if (!sellerId) {
    res.status(400).json({ error: "seller_id is required" })
    return
  }

  const entry = await getSellerEntry(req.scope, orderId, sellerId)
  if (!entry) {
    res.status(404).json({ error: "No confirmation record for this seller." })
    return
  }
  if (entry.status !== "escalated") {
    res.status(409).json({
      error: `Order is ${entry.status}, not awaiting an admin decision.`,
      status: entry.status,
    })
    return
  }

  const { entry: next, strike } = applyAdminTake(entry, Date.now())
  await persistConfirmEntry(req.scope, orderId, sellerId, next)

  const full = await loadOrderForConfirm(req.scope, orderId)
  if (strike) {
    await recordProducerStrike(req.scope, sellerId, {
      order_id: orderId,
      display_id: full?.display_id ?? null,
      reason: "Hub took over the order after no producer confirmation.",
      tier: entry.tier,
    })
  }
  if (full) {
    await notifyResolution(req.scope, full, sellerId, "hub_taken")
  }

  res.json({ ok: true, status: next.status })
}
