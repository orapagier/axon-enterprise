import type { MedusaContainer } from "@medusajs/framework/types"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"
import { DISPATCH_MODULE } from "../modules/dispatch"
import type DispatchModuleService from "../modules/dispatch/service"
import { COD_LEDGER_MODULE } from "../modules/cod-ledger"
import type CodLedgerModuleService from "../modules/cod-ledger/service"
import { isDuplicateCodTransaction } from "../modules/cod-ledger/is-duplicate"
import { ACCOUNTABILITY_MODULE } from "../modules/accountability"
import type AccountabilityModuleService from "../modules/accountability/service"
import { sendEmail } from "./notify"
import { notifyCustomer } from "./notify-customer"
import { notifyAdmin } from "./notify-admin"

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

/**
 * Stamp the buyer's `last_clean_order_at` on a completed delivery. This feeds
 * the clean-order-tick recovery path (warned → normal after 6 clean months) —
 * without it a warned buyer could never recover. Only existing status rows are
 * touched: a buyer without one has no strikes, so there is nothing to recover.
 * Best-effort: an accountability hiccup must not fail a delivery that is
 * already marked and ledgered.
 */
async function touchLastCleanOrder(
  container: MedusaContainer,
  customerId: string
): Promise<void> {
  try {
    const accountability: AccountabilityModuleService = container.resolve(
      ACCOUNTABILITY_MODULE
    )
    const [status] = await accountability.listBuyerAccountStatuses(
      { customer_id: customerId },
      { take: 1 }
    )
    if (status) {
      await accountability.updateBuyerAccountStatuses({
        id: status.id,
        last_clean_order_at: new Date(),
      })
    }
  } catch (err) {
    const logger = container.resolve(ContainerRegistrationKeys.LOGGER)
    logger.warn(
      `Could not stamp last_clean_order_at for customer ${customerId}: ${
        (err as Error).message
      }`
    )
  }
}

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
 *
 * The recorded amount is the full cash in the rider's hand = the order total.
 * The delivery fee is now a real shipping line on the order, so `order.total`
 * already includes it — reconciliation must NOT add it again.
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

  // `summary.*` is loaded alongside `total` because the computed total only
  // resolves reliably with the summary present (same quirk the OTC counter
  // route hit, where `total` alone read 0).
  const { data: orderRows } = await query.graph({
    entity: "order",
    fields: [
      "id",
      "display_id",
      "email",
      "customer_id",
      "total",
      "summary.*",
      "metadata",
    ],
    filters: { id: dispatchOrder.order_id },
  })
  const order = orderRows[0] as unknown as
    | {
        id: string
        display_id: number
        email: string | null
        customer_id: string | null
        total: number | string
        summary?: { current_order_total?: number } | null
        metadata?: { delivery_fee_php?: number | string } | null
      }
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

  const newlyDelivered = dispatchOrder.delivery_status !== "delivered"
  if (newlyDelivered) {
    await dispatchService.updateDispatchOrders({
      id: args.dispatchOrderId,
      delivery_status: "delivered",
      delivered_at: new Date(),
      // A rider id supplied at confirmation time (e.g. the admin route's late
      // assignment) must land on the dispatch order too, or the ledger and the
      // manifest would name different riders.
      ...(riderId && dispatchOrder.rider_id !== riderId
        ? { rider_id: riderId }
        : {}),
    })
    await touchLastCleanOrder(container, order.customer_id)
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
      const total = Number(order.total ?? order.summary?.current_order_total ?? 0)
      // What the buyer owes at the door = the order total. The delivery fee is
      // already a shipping line inside that total, so it must not be re-added.
      const expected = Math.round(total * 100)
      // The rider can report a different figure (partial / short payment); fall
      // back to the expected amount when none is supplied.
      const amount = args.amountOverride ?? expected
      if (amount <= 0) {
        return {
          ok: false,
          status: 400,
          error: "Could not resolve a positive amount",
        }
      }
      const shortBy = expected > 0 ? expected - amount : 0
      const notes =
        shortBy > 0
          ? `Auto-recorded on delivery confirmation. SHORT ₱${(
              shortBy / 100
            ).toFixed(2)} vs expected ₱${(expected / 100).toFixed(2)}.`
          : "Auto-recorded on delivery confirmation."
      try {
        transaction = await ledger.createCodTransactions({
          customer_id: order.customer_id,
          order_id: order.id,
          type: "cod_collected",
          amount,
          expected_amount: expected > 0 ? expected : null,
          rider_id: riderId,
          recorded_by: args.recordedBy ?? null,
          notes,
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

  if (newlyDelivered) {
    await sendEmail(container, {
      to: order.email,
      template: "order-delivered",
      data: {
        display_id: order.display_id,
        payment: isOtc ? "otc" : "cod",
        collected_php: transaction ? Number(transaction.amount) / 100 : null,
      },
    })
    await notifyCustomer(container, {
      customerId: order.customer_id,
      type: "delivery",
      title: "Delivered ✓",
      body: `Your order #${order.display_id} has been delivered.`,
      url: "/account/orders",
      tag: `order-${order.id}`,
    })
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
    fields: ["id", "display_id", "email", "customer_id"],
    filters: { id: dispatchOrder.order_id },
  })
  const order = orderRows[0] as unknown as
    | {
        id: string
        display_id: number
        email: string | null
        customer_id: string | null
      }
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

  await sendEmail(container, {
    to: order.email,
    template: "dispute-opened",
    data: { display_id: order.display_id },
  })

  // A refused delivery opens a dispute the admin must adjudicate within the SLA.
  await notifyAdmin(container, {
    title: "⚠️ Delivery refused — dispute opened",
    lines: [
      `Order #${order.display_id}`,
      order.email && `Buyer: ${order.email}`,
      args.riderNotes && `Rider notes: ${args.riderNotes}`,
    ],
    url: "/app/disputes",
  })

  return { ok: true, created: true, dispute }
}
