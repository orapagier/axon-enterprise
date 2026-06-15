import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { assertProducer } from "../../../../../../lib/seller-auth"
import {
  applyProducerConfirm,
  isTerminal,
} from "../../../../../../lib/producer-confirm"
import {
  getSellerEntry,
  persistConfirmEntry,
  recordProducerStrike,
} from "../../../../../../lib/producer-confirm-store"

/**
 * POST /store/seller/orders/:id/confirm
 *
 * The producer accepts their portion of a direct order. On-time → clean confirm.
 * Confirming late (past the deadline or after escalation, while the admin hasn't
 * acted yet) is still allowed but records a strike — the buyer was kept waiting.
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

  const { entry: next, strike } = applyProducerConfirm(entry, Date.now())
  await persistConfirmEntry(req.scope, orderId, producer.id, next)

  if (strike) {
    await recordProducerStrike(req.scope, producer.id, {
      order_id: orderId,
      display_id: null,
      reason: "Confirmed late (past the confirmation window).",
      tier: entry.tier,
    })
  }

  res.json({ ok: true, status: next.status, late: next.late ?? false, strike })
}
