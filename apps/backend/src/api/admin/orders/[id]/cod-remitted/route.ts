import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"
import { COD_LEDGER_MODULE } from "../../../../../modules/cod-ledger"
import type CodLedgerModuleService from "../../../../../modules/cod-ledger/service"
import { isDuplicateCodTransaction } from "../../../../../modules/cod-ledger/is-duplicate"

/**
 * POST /admin/orders/:id/cod-remitted
 * Body: { amount: number, rider_id: string, notes?: string }
 *
 * Records that the rider handed cash to the hub cashier for this order.
 * Writes a `rider_remitted` ledger row. Idempotency: 409 if already remitted.
 */
export async function POST(req: MedusaRequest, res: MedusaResponse) {
  const ledger: CodLedgerModuleService = req.scope.resolve(COD_LEDGER_MODULE)
  const query = req.scope.resolve(ContainerRegistrationKeys.QUERY)

  const orderId = req.params.id
  const body = req.body as {
    amount?: number
    rider_id?: string
    notes?: string
  }
  if (!body.amount || body.amount <= 0) {
    res.status(400).json({ error: "amount (centavos > 0) required" })
    return
  }
  if (!body.rider_id) {
    res.status(400).json({ error: "rider_id required" })
    return
  }

  const { data: orderRows } = await query.graph({
    entity: "order",
    fields: ["id", "customer_id"],
    filters: { id: orderId },
  })
  const order = orderRows[0] as
    | { id: string; customer_id: string | null }
    | undefined
  if (!order?.customer_id) {
    res.status(404).json({ error: "Order or customer not found" })
    return
  }

  // Remittance is the second leg of collected → remitted: there must be a
  // cod_collected row first, and the remitting rider must be the one who
  // collected (otherwise the per-rider outstanding math is corrupted).
  const [collectedRow] = await ledger.listCodTransactions(
    { order_id: orderId, type: "cod_collected" },
    { take: 1 }
  )
  if (!collectedRow) {
    res.status(409).json({
      error:
        "No cod_collected row for this order yet — record the collection (delivery confirmation) before the remittance.",
    })
    return
  }
  if (collectedRow.rider_id && collectedRow.rider_id !== body.rider_id) {
    res.status(409).json({
      error: `This order's cash was collected by rider ${collectedRow.rider_id}; remit under that rider.`,
    })
    return
  }

  const existingRemit = await ledger.listCodTransactions(
    { order_id: orderId, type: "rider_remitted" },
    { take: 1 }
  )
  if (existingRemit.length > 0) {
    res.status(409).json({
      error: "Order already marked as rider_remitted.",
      transaction: existingRemit[0],
    })
    return
  }

  const actorId =
    (req as unknown as { auth_context?: { actor_id?: string } }).auth_context
      ?.actor_id ?? null

  let tx
  try {
    // Benchmark the remittance against what the rider collected so the aging
    // report can flag a rider who hands over less than they took.
    const collectedAmt = collectedRow.amount
    const shortBy = collectedAmt - body.amount
    const shortNote =
      shortBy > 0
        ? `SHORT ₱${(shortBy / 100).toFixed(2)} vs collected ₱${(
            collectedAmt / 100
          ).toFixed(2)}.`
        : null
    tx = await ledger.createCodTransactions({
      customer_id: order.customer_id,
      order_id: orderId,
      type: "rider_remitted",
      amount: body.amount,
      expected_amount: collectedAmt,
      rider_id: body.rider_id,
      recorded_by: actorId,
      notes: [body.notes, shortNote].filter(Boolean).join(" ") || null,
    })
  } catch (err) {
    // Lost the race against a concurrent remit: the unique index rejected the
    // second insert. Surface it as the same 409 the read check returns.
    if (isDuplicateCodTransaction(err)) {
      const [existingRow] = await ledger.listCodTransactions(
        { order_id: orderId, type: "rider_remitted" },
        { take: 1 }
      )
      res.status(409).json({
        error: "Order already marked as rider_remitted.",
        transaction: existingRow,
      })
      return
    }
    throw err
  }

  res.status(201).json({ transaction: tx })
}
