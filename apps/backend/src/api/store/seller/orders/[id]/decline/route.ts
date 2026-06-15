import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { assertProducer } from "../../../../../../lib/seller-auth"
import {
  applyProducerDecline,
  isTerminal,
} from "../../../../../../lib/producer-confirm"
import {
  getSellerEntry,
  persistConfirmEntry,
  recordProducerStrike,
  loadOrderForConfirm,
  cancelMedusaOrderForProducer,
  notifyResolution,
} from "../../../../../../lib/producer-confirm-store"

/**
 * POST /store/seller/orders/:id/decline
 *
 * The producer turns the order down. Declining is a non-fulfilment, so it
 * cancels the order (if it's entirely this producer's — else the admin splits
 * it), records a strike, and notifies the buyer.
 */
export async function POST(req: MedusaRequest, res: MedusaResponse) {
  const producer = await assertProducer(req, res)
  if (!producer) return

  const orderId = req.params.id
  const entry = await getSellerEntry(req.scope, orderId, producer.id)
  if (!entry) {
    res.status(404).json({ error: "No confirmation pending for this order." })
    return
  }
  if (isTerminal(entry.status)) {
    res.status(409).json({
      error: `This order is already ${entry.status}.`,
      status: entry.status,
    })
    return
  }

  const { entry: next, strike } = applyProducerDecline(entry, Date.now())
  await persistConfirmEntry(req.scope, orderId, producer.id, next)

  if (strike) {
    await recordProducerStrike(req.scope, producer.id, {
      order_id: orderId,
      display_id: null,
      reason: "Producer declined the order.",
      tier: entry.tier,
    })
  }

  const full = await loadOrderForConfirm(req.scope, orderId)
  if (full) {
    await cancelMedusaOrderForProducer(
      req.scope,
      full,
      producer.id,
      "producer declined"
    )
    await notifyResolution(req.scope, full, producer.id, "cancelled")
  }

  res.json({ ok: true, status: next.status })
}
