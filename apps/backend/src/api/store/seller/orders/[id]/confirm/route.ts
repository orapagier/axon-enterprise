import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { assertProducer } from "../../../../../../lib/seller-auth"
import {
  applyProducerConfirm,
  isTerminal,
} from "../../../../../../lib/producer-confirm"
import {
  getSellerEntry,
  updateConfirmEntry,
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
  // Fast-path check for a friendlier error before we take the lock; the
  // authoritative check happens inside updateConfirmEntry against fresh state.
  const preview = await getSellerEntry(req.scope, orderId, producer.id)
  if (!preview) {
    res.status(404).json({ error: "No confirmation pending for this order." })
    return
  }
  if (isTerminal(preview.status)) {
    res.status(409).json({
      error: `This order is already ${preview.status}.`,
      status: preview.status,
    })
    return
  }

  // Apply the confirmation under the per-order lock. If the nightly tick
  // terminated the entry (e.g. auto-cancelled) between the preview read and
  // here, abort instead of overwriting that cancellation.
  let outcome: { status: string; late: boolean; strike: boolean } | null = null
  let terminalStatus: string | null = null
  const applied = await updateConfirmEntry(
    req.scope,
    orderId,
    producer.id,
    (current) => {
      if (!current || isTerminal(current.status)) {
        terminalStatus = current?.status ?? null
        return null
      }
      const { entry: next, strike } = applyProducerConfirm(current, Date.now())
      outcome = { status: next.status, late: next.late ?? false, strike }
      return next
    }
  )

  if (!applied || !outcome) {
    res.status(409).json({
      error: terminalStatus
        ? `This order is already ${terminalStatus}.`
        : "No confirmation pending for this order.",
      status: terminalStatus,
    })
    return
  }
  const result = outcome as { status: string; late: boolean; strike: boolean }

  if (result.strike) {
    await recordProducerStrike(req.scope, producer.id, {
      order_id: orderId,
      display_id: null,
      reason: "Confirmed late (past the confirmation window).",
      tier: preview.tier,
    })
  }

  res.json({
    ok: true,
    status: result.status,
    late: result.late,
    strike: result.strike,
  })
}
