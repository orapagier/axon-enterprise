import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { assertProducer } from "../../../../../../lib/seller-auth"
import { disputeProducerStrike } from "../../../../../../lib/producer-confirm-store"

/**
 * POST /store/seller/orders/:id/dispute-strike
 * Body: { note?: string }
 *
 * The producer contests the confirmation strike recorded for this order. Flags
 * the strike-log entry as disputed and pings the admin to review/reverse it.
 */
export async function POST(req: MedusaRequest, res: MedusaResponse) {
  const producer = await assertProducer(req, res)
  if (!producer) return

  const orderId = req.params.id
  const note = ((req.body ?? {}) as { note?: string }).note?.trim() || null

  const ok = await disputeProducerStrike(req.scope, producer.id, orderId, note)
  if (!ok) {
    res.status(404).json({
      error: "No disputable strike found for this order.",
    })
    return
  }
  res.json({ ok: true })
}
