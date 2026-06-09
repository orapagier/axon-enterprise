import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"
import { DISPATCH_MODULE } from "../../../../../modules/dispatch"
import type DispatchModuleService from "../../../../../modules/dispatch/service"
import { COD_LEDGER_MODULE } from "../../../../../modules/cod-ledger"
import type CodLedgerModuleService from "../../../../../modules/cod-ledger/service"
import { isDuplicateCodTransaction } from "../../../../../modules/cod-ledger/is-duplicate"
import { RIDER_MODULE } from "../../../../../modules/rider"
import type RiderModuleService from "../../../../../modules/rider/service"

type CodTx = Awaited<
  ReturnType<CodLedgerModuleService["listCodTransactions"]>
>[number]

/**
 * POST /admin/dispatch-orders/:id/delivered
 * Body: { amount?: number (centavos), rider_id?: string }
 *
 * Rider (entered by admin / hub cashier on the rider's behalf for now; the same
 * logic will back the rider self-service "Delivered" button later) confirms a
 * delivery. In one step:
 *   1. marks the DispatchOrder delivered (+ delivered_at), and
 *   2. for a COD order, records `cod_collected` — the rider now holds (and owes)
 *      that cash. Delivered ≠ remitted: remittance is a separate event.
 *
 * OTC orders are already paid at the hub counter (an `otc_collected` row exists),
 * so no cash is recorded on delivery — only the delivery is marked.
 *
 * Idempotent: re-confirming a delivered order is a no-op; the unique
 * (order_id, type) ledger index prevents a second cod_collected row.
 */
export async function POST(req: MedusaRequest, res: MedusaResponse) {
  const dispatchService: DispatchModuleService =
    req.scope.resolve(DISPATCH_MODULE)
  const ledger: CodLedgerModuleService = req.scope.resolve(COD_LEDGER_MODULE)
  const query = req.scope.resolve(ContainerRegistrationKeys.QUERY)

  const dispatchOrderId = req.params.id
  const body = (req.body ?? {}) as { amount?: number; rider_id?: string }

  const [dispatchOrder] = await dispatchService.listDispatchOrders(
    { id: dispatchOrderId },
    { take: 1 }
  )
  if (!dispatchOrder) {
    res.status(404).json({ error: "Dispatch order not found" })
    return
  }

  const { data: orderRows } = await query.graph({
    entity: "order",
    fields: ["id", "customer_id", "total"],
    filters: { id: dispatchOrder.order_id },
  })
  const order = orderRows[0] as
    | { id: string; customer_id: string | null; total: number | string }
    | undefined
  if (!order?.customer_id) {
    res.status(404).json({ error: "Order or customer not found" })
    return
  }

  const riderId = body.rider_id ?? dispatchOrder.rider_id ?? null

  // OTC orders are paid at the counter; their cash is recorded as otc_collected
  // before dispatch. If that row exists, delivery collects no rider cash.
  const [otcRow] = await ledger.listCodTransactions(
    { order_id: order.id, type: "otc_collected" },
    { take: 1 }
  )
  const isOtc = !!otcRow

  // COD cash must be attributable to a rider.
  if (!isOtc && !riderId) {
    res.status(400).json({
      error: "Assign a rider before marking a COD delivery as delivered.",
    })
    return
  }

  // 1. Mark delivered (idempotent).
  if (dispatchOrder.delivery_status !== "delivered") {
    await dispatchService.updateDispatchOrders({
      id: dispatchOrderId,
      delivery_status: "delivered",
      delivered_at: new Date(),
    })
  }

  // 2. For COD, record cod_collected.
  let transaction: CodTx | null = null
  if (!isOtc) {
    const existing = await ledger.listCodTransactions(
      { order_id: order.id, type: "cod_collected" },
      { take: 1 }
    )
    if (existing.length > 0) {
      transaction = existing[0]
    } else {
      const amount = body.amount ?? Math.round(Number(order.total ?? 0) * 100)
      if (amount <= 0) {
        res.status(400).json({ error: "Could not resolve a positive amount" })
        return
      }
      const actorId =
        (req as unknown as { auth_context?: { actor_id?: string } })
          .auth_context?.actor_id ?? null
      try {
        transaction = await ledger.createCodTransactions({
          customer_id: order.customer_id,
          order_id: order.id,
          type: "cod_collected",
          amount,
          rider_id: riderId,
          recorded_by: actorId,
          notes: "Auto-recorded on delivery confirmation.",
        })
      } catch (err) {
        if (isDuplicateCodTransaction(err)) {
          const [row] = await ledger.listCodTransactions(
            { order_id: order.id, type: "cod_collected" },
            { take: 1 }
          )
          transaction = row
        } else {
          throw err
        }
      }
    }
  }

  res.status(200).json({
    dispatch_order_id: dispatchOrderId,
    delivery_status: "delivered",
    payment: isOtc ? "otc" : "cod",
    transaction,
  })
}
