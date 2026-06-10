import type { MedusaContainer } from "@medusajs/framework/types"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"
import { DISPATCH_MODULE } from "../modules/dispatch"
import type DispatchModuleService from "../modules/dispatch/service"
import { COD_LEDGER_MODULE } from "../modules/cod-ledger"
import type CodLedgerModuleService from "../modules/cod-ledger/service"
import { isDuplicateCodTransaction } from "../modules/cod-ledger/is-duplicate"
import { ACCOUNTABILITY_MODULE } from "../modules/accountability"
import type AccountabilityModuleService from "../modules/accountability/service"

/**
 * Shared delivery-outcome logic, used by both the admin routes (cashier on the
 * rider's behalf) and the rider self-service /rider/* routes so the behaviour
 * is identical regardless of who triggers it.
 */

type CodTx = Awaited<
  ReturnType<CodLedgerModuleService["listCodTransactions"]>
>[number]
type RefusalDispute = Awaited<
  ReturnType<AccountabilityModuleService["listRefusalDisputes"]>
>[number]

export type ConfirmDeliveryResult =
  | {
      ok: true
      dispatch_order_id: string
      payment: "cod" | "otc"
      transaction: CodTx | null
    }
  | { ok: false; status: number; error: string }

/**
 * Mark a dispatch order delivered and, for a COD order, record `cod_collected`
 * (the rider now owes that cash). OTC orders are already paid at the counter,
 * so only the delivery is marked. Idempotent.
 */
export async function confirmDelivery(
  container: MedusaContainer,
  args: {
    dispatchOrderId: string
    riderId?: string | null
    amountOverride?: number
    recordedBy?: string | null
  }
): Promise<ConfirmDeliveryResult> {
  const dispatchService: DispatchModuleService =
    container.resolve(DISPATCH_MODULE)
  const ledger: CodLedgerModuleService = container.resolve(COD_LEDGER_MODULE)
  const query = container.resolve(ContainerRegistrationKeys.QUERY)

  const [dispatchOrder] = await dispatchService.listDispatchOrders(
    { id: args.dispatchOrderId },
    { take: 1 }
  )
  if (!dispatchOrder) {
    return { ok: false, status: 404, error: "Dispatch order not found" }
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
    return { ok: false, status: 404, error: "Order or customer not found" }
  }

  const riderId = args.riderId ?? dispatchOrder.rider_id ?? null

  const [otcRow] = await ledger.listCodTransactions(
    { order_id: order.id, type: "otc_collected" },
    { take: 1 }
  )
  const isOtc = !!otcRow

  if (!isOtc && !riderId) {
    return {
      ok: false,
      status: 400,
      error: "Assign a rider before marking a COD delivery as delivered.",
    }
  }

  if (dispatchOrder.delivery_status !== "delivered") {
    await dispatchService.updateDispatchOrders({
      id: args.dispatchOrderId,
      delivery_status: "delivered",
      delivered_at: new Date(),
    })
  }

  let transaction: CodTx | null = null
  if (!isOtc) {
    const existing = await ledger.listCodTransactions(
      { order_id: order.id, type: "cod_collected" },
      { take: 1 }
    )
    if (existing.length > 0) {
      transaction = existing[0]
    } else {
      const amount =
        args.amountOverride ?? Math.round(Number(order.total ?? 0) * 100)
      if (amount <= 0) {
        return {
          ok: false,
          status: 400,
          error: "Could not resolve a positive amount",
        }
      }
      try {
        transaction = await ledger.createCodTransactions({
          customer_id: order.customer_id,
          order_id: order.id,
          type: "cod_collected",
          amount,
          rider_id: riderId,
          recorded_by: args.recordedBy ?? null,
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

  return {
    ok: true,
    dispatch_order_id: args.dispatchOrderId,
    payment: isOtc ? "otc" : "cod",
    transaction,
  }
}

export type RecordRefusalResult =
  | { ok: true; created: boolean; dispute: RefusalDispute }
  | { ok: false; status: number; error: string }

/**
 * Mark a dispatch order refused and open a pending RefusalDispute. Idempotent:
 * a second call returns the existing dispute.
 */
export async function recordRefusal(
  container: MedusaContainer,
  args: {
    dispatchOrderId: string
    riderId?: string | null
    riderPhotoUrl?: string | null
    riderNotes?: string | null
  }
): Promise<RecordRefusalResult> {
  const dispatchService: DispatchModuleService =
    container.resolve(DISPATCH_MODULE)
  const accountability: AccountabilityModuleService =
    container.resolve(ACCOUNTABILITY_MODULE)
  const query = container.resolve(ContainerRegistrationKeys.QUERY)

  const [dispatchOrder] = await dispatchService.listDispatchOrders(
    { id: args.dispatchOrderId },
    { take: 1 }
  )
  if (!dispatchOrder) {
    return { ok: false, status: 404, error: "Dispatch order not found" }
  }

  const { data: orderRows } = await query.graph({
    entity: "order",
    fields: ["id", "customer_id"],
    filters: { id: dispatchOrder.order_id },
  })
  const order = orderRows[0] as
    | { id: string; customer_id: string | null }
    | undefined
  if (!order?.customer_id) {
    return { ok: false, status: 404, error: "Order or customer not found" }
  }

  const [existing] = await accountability.listRefusalDisputes(
    { dispatch_order_id: args.dispatchOrderId },
    { take: 1 }
  )
  if (existing) {
    return { ok: true, created: false, dispute: existing }
  }

  await dispatchService.updateDispatchOrders({
    id: args.dispatchOrderId,
    delivery_status: "refused",
  })

  const dispute = (await accountability.createRefusalDisputes({
    order_id: order.id,
    dispatch_order_id: args.dispatchOrderId,
    customer_id: order.customer_id,
    rider_id: args.riderId ?? dispatchOrder.rider_id,
    rider_photo_url: args.riderPhotoUrl ?? null,
    rider_notes: args.riderNotes ?? null,
    resolution: "pending",
  })) as RefusalDispute

  return { ok: true, created: true, dispute }
}
