import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { applyCancel } from "../../../../../lib/producer-confirm"
import {
  getSellerEntry,
  persistConfirmEntry,
  recordProducerStrike,
  loadOrderForConfirm,
  cancelMedusaOrderForProducer,
  notifyResolution,
} from "../../../../../lib/producer-confirm-store"

/**
 * POST /admin/producer-orders/:id/cancel
 * Body: { seller_id }
 *
 * The hub can't source the unconfirmed items, so the order is cancelled. The
 * producer gets a strike and the buyer is notified.
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

  const { entry: next, strike } = applyAdminCancel(entry, Date.now())
  await persistConfirmEntry(req.scope, orderId, sellerId, next)

  const full = await loadOrderForConfirm(req.scope, orderId)
  if (strike) {
    await recordProducerStrike(req.scope, sellerId, {
      order_id: orderId,
      display_id: full?.display_id ?? null,
      reason: "Order cancelled by admin after no producer confirmation.",
      tier: entry.tier,
    })
  }
  if (full) {
    await cancelMedusaOrderForProducer(
      req.scope,
      full,
      sellerId,
      "admin cancelled after no producer confirmation"
    )
    await notifyResolution(req.scope, full, sellerId, "cancelled")
  }

  res.json({ ok: true, status: next.status })
}
