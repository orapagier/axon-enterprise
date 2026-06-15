/**
 * Runtime (DB-touching) side of the producer-confirmation lifecycle. The pure
 * state machine lives in ./producer-confirm; this module persists it on the
 * order, records producer strikes on the producer's customer metadata, cancels
 * the Medusa order when fulfilment falls through, and fans the buyer/producer
 * notifications. Everything here is best-effort — a notify or strike hiccup
 * must never strand the order in a half-resolved state.
 */
import type { MedusaContainer } from "@medusajs/framework/types"
import { ContainerRegistrationKeys, Modules } from "@medusajs/framework/utils"
import { cancelOrderWorkflow } from "@medusajs/medusa/core-flows"
import { sendEmail } from "./notify"
import { sendPush } from "./push"
import { notifyAdmin } from "./notify-admin"
import {
  routeOrderItems,
  formatItemLine,
  type RoutableItem,
  type ProductRouteMeta,
} from "./order-routing"
import type { ProducerConfirmEntry, ProducerConfirmMap } from "./producer-confirm"

export const CONFIRM_META_KEY = "producer_confirm"

type OrderForConfirm = {
  id: string
  display_id: number
  email: string | null
  metadata: Record<string, unknown> | null
  items: RoutableItem[] | null
  shipping_address: {
    first_name: string | null
    last_name: string | null
    phone: string | null
    address_1: string | null
    city: string | null
    postal_code: string | null
    metadata: Record<string, unknown> | null
  } | null
}

const ORDER_FIELDS = [
  "id",
  "display_id",
  "email",
  "metadata",
  "items.title",
  "items.quantity",
  "items.product_id",
  "shipping_address.first_name",
  "shipping_address.last_name",
  "shipping_address.phone",
  "shipping_address.address_1",
  "shipping_address.city",
  "shipping_address.postal_code",
  "shipping_address.metadata",
]

export async function loadOrderForConfirm(
  container: MedusaContainer,
  orderId: string
): Promise<OrderForConfirm | null> {
  const query = container.resolve(ContainerRegistrationKeys.QUERY)
  const { data } = await query.graph({
    entity: "order",
    fields: ORDER_FIELDS,
    filters: { id: orderId },
  })
  return (data[0] as unknown as OrderForConfirm) ?? null
}

export type ConfirmRow = {
  order_id: string
  display_id: number
  email: string | null
  created_at: string | null
  seller_id: string
  entry: ProducerConfirmEntry
}

/**
 * Scan recent orders for producer-confirm entries. Filter to one seller (the
 * producer's own list) and/or a set of statuses (e.g. the admin's escalated
 * queue). Window defaults to 7 days — wide enough for any live entry plus
 * recent history.
 */
export async function scanConfirmRows(
  container: MedusaContainer,
  opts: { sellerId?: string; statuses?: ProducerConfirmEntry["status"][]; windowMs?: number }
): Promise<ConfirmRow[]> {
  const query = container.resolve(ContainerRegistrationKeys.QUERY)
  const windowMs = opts.windowMs ?? 7 * 24 * 60 * 60_000
  const since = new Date(Date.now() - windowMs)
  const { data } = await query.graph({
    entity: "order",
    fields: ["id", "display_id", "email", "metadata", "created_at"],
    filters: { created_at: { $gte: since } },
    pagination: { take: 1000, order: { created_at: "DESC" } },
  })
  const rows: ConfirmRow[] = []
  for (const o of data as unknown as Array<{
    id: string
    display_id: number
    email: string | null
    metadata: Record<string, unknown> | null
    created_at: string | null
  }>) {
    const map = readConfirmMap(o.metadata)
    for (const sellerId of Object.keys(map)) {
      if (opts.sellerId && sellerId !== opts.sellerId) continue
      const entry = map[sellerId]
      if (opts.statuses && !opts.statuses.includes(entry.status)) continue
      rows.push({
        order_id: o.id,
        display_id: o.display_id,
        email: o.email,
        created_at: o.created_at,
        seller_id: sellerId,
        entry,
      })
    }
  }
  return rows
}

export function readConfirmMap(
  meta: Record<string, unknown> | null | undefined
): ProducerConfirmMap {
  const raw = (meta ?? {})[CONFIRM_META_KEY]
  if (raw && typeof raw === "object" && !Array.isArray(raw)) {
    return raw as ProducerConfirmMap
  }
  return {}
}

/**
 * Merge one seller's entry into order.metadata.producer_confirm and persist.
 * Re-reads the live metadata first so a concurrent write to a different seller
 * in the same order isn't clobbered.
 */
export async function persistConfirmEntry(
  container: MedusaContainer,
  orderId: string,
  sellerId: string,
  entry: ProducerConfirmEntry
): Promise<void> {
  const query = container.resolve(ContainerRegistrationKeys.QUERY)
  const orderModule = container.resolve(Modules.ORDER)
  const { data } = await query.graph({
    entity: "order",
    fields: ["id", "metadata"],
    filters: { id: orderId },
  })
  const meta = ((data[0] as { metadata?: Record<string, unknown> | null })
    ?.metadata ?? {}) as Record<string, unknown>
  const map = readConfirmMap(meta)
  map[sellerId] = entry
  await orderModule.updateOrders([
    { id: orderId, metadata: { ...meta, [CONFIRM_META_KEY]: map } },
  ])
}

/** Read one seller's confirm entry off an order, or null if there isn't one. */
export async function getSellerEntry(
  container: MedusaContainer,
  orderId: string,
  sellerId: string
): Promise<ProducerConfirmEntry | null> {
  const query = container.resolve(ContainerRegistrationKeys.QUERY)
  const { data } = await query.graph({
    entity: "order",
    fields: ["id", "metadata"],
    filters: { id: orderId },
  })
  const meta = (data[0] as { metadata?: Record<string, unknown> | null })
    ?.metadata
  return readConfirmMap(meta)[sellerId] ?? null
}

export type ProducerStrikeInfo = {
  order_id: string
  display_id: number | null
  reason: string
  tier: string
}

/**
 * Record a non-fulfilment strike against a producer on their customer metadata
 * (the buyer strike system — prepay locks — doesn't model producers). Returns
 * the new running count. Strikes are disputable; the log keeps the last 20.
 */
export async function recordProducerStrike(
  container: MedusaContainer,
  sellerId: string,
  info: ProducerStrikeInfo
): Promise<number> {
  const customerModule = container.resolve(Modules.CUSTOMER)
  const customer = await customerModule
    .retrieveCustomer(sellerId, { select: ["id", "metadata"] })
    .catch(() => null)
  const meta = ((customer?.metadata ?? {}) as Record<string, unknown>)
  const count = Number(meta.producer_confirm_strikes ?? 0) + 1
  const log = Array.isArray(meta.producer_confirm_strike_log)
    ? (meta.producer_confirm_strike_log as unknown[])
    : []
  const newEntry = { ...info, at: Date.now(), disputed: false }
  const trimmed = [newEntry, ...log].slice(0, 20)
  await customerModule.updateCustomers(sellerId, {
    metadata: {
      ...meta,
      producer_confirm_strikes: count,
      producer_confirm_strike_log: trimmed,
    },
  })
  return count
}

/** Producer disputes their most recent strike for an order → flag + tell admin. */
export async function disputeProducerStrike(
  container: MedusaContainer,
  sellerId: string,
  orderId: string,
  note: string | null
): Promise<boolean> {
  const customerModule = container.resolve(Modules.CUSTOMER)
  const customer = await customerModule
    .retrieveCustomer(sellerId, { select: ["id", "metadata", "email"] })
    .catch(() => null)
  if (!customer) return false
  const meta = (customer.metadata ?? {}) as Record<string, unknown>
  const log = Array.isArray(meta.producer_confirm_strike_log)
    ? ([...meta.producer_confirm_strike_log] as Record<string, unknown>[])
    : []
  const idx = log.findIndex((e) => e?.order_id === orderId && !e?.disputed)
  if (idx === -1) return false
  log[idx] = { ...log[idx], disputed: true, dispute_note: note, disputed_at: Date.now() }
  await customerModule.updateCustomers(sellerId, {
    metadata: { ...meta, producer_confirm_strike_log: log },
  })
  await notifyAdmin(container, {
    title: "⚖️ Producer disputed a confirmation strike",
    lines: [
      `Producer: ${customer.email ?? sellerId}`,
      `Order strike under review`,
      note && `Note: ${note}`,
    ],
    url: "/app/orders",
  })
  return true
}

function buyerName(addr: OrderForConfirm["shipping_address"]): string {
  return addr
    ? [addr.first_name, addr.last_name].filter(Boolean).join(" ").trim()
    : ""
}

/** Build a metaByProductId map for the order's items (selling_mode + seller). */
async function loadProductMeta(
  container: MedusaContainer,
  items: RoutableItem[]
): Promise<Map<string, ProductRouteMeta>> {
  const query = container.resolve(ContainerRegistrationKeys.QUERY)
  const ids = [...new Set(items.map((i) => i.product_id).filter(Boolean))] as string[]
  const map = new Map<string, ProductRouteMeta>()
  if (!ids.length) return map
  const { data: products } = await query.graph({
    entity: "product",
    fields: ["id", "metadata"],
    filters: { id: ids },
  })
  for (const p of products as { id: string; metadata?: ProductRouteMeta | null }[]) {
    map.set(p.id, (p.metadata ?? {}) as ProductRouteMeta)
  }
  return map
}

/** Comma-joined "2× Bananas" lines for one producer's items in an order. */
export async function producerItemLines(
  container: MedusaContainer,
  order: OrderForConfirm,
  sellerId: string
): Promise<string> {
  const items = (order.items ?? []).filter((i) => i && i.title)
  if (!items.length) return ""
  const metaByProductId = await loadProductMeta(container, items)
  const { producers } = routeOrderItems(items, metaByProductId)
  const mine = producers.find((p) => p.sellerId === sellerId)
  return (mine?.items ?? []).map(formatItemLine).join(", ")
}

/**
 * Cancel the Medusa order when a producer's items can't be fulfilled. Only safe
 * to cancel the whole order when it's ENTIRELY this one producer's (no hub items,
 * no other producers) — otherwise we'd punish the buyer for other sellers, so we
 * flag the admin to split it by hand instead.
 *
 * Returns whether the Medusa order was actually cancelled.
 */
export async function cancelMedusaOrderForProducer(
  container: MedusaContainer,
  order: OrderForConfirm,
  sellerId: string,
  reason: string
): Promise<{ cancelled: boolean }> {
  const logger = container.resolve(ContainerRegistrationKeys.LOGGER)
  const items = (order.items ?? []).filter((i) => i && i.title)
  const metaByProductId = await loadProductMeta(container, items)
  const { producers, hubItems } = routeOrderItems(items, metaByProductId)

  const wholeOrderIsThisProducer =
    hubItems.length === 0 &&
    producers.length === 1 &&
    producers[0].sellerId === sellerId

  if (!wholeOrderIsThisProducer) {
    // Mixed order — cancelling the whole thing would hurt the buyer + other
    // sellers. Hand it to a human to split.
    await notifyAdmin(container, {
      title: "✂️ Manual split-cancel needed",
      lines: [
        `Order #${order.display_id}`,
        `Producer items couldn't be confirmed (${reason}).`,
        "This order also has other sellers' items — cancel only the affected lines by hand.",
      ],
      url: "/app/orders",
    })
    return { cancelled: false }
  }

  try {
    await cancelOrderWorkflow(container).run({
      input: { order_id: order.id, no_notification: true },
    })
    logger.info(
      `producer-confirm: cancelled order ${order.id} (${reason}).`
    )
    return { cancelled: true }
  } catch (err) {
    logger.warn(
      `producer-confirm: cancelOrderWorkflow failed for ${order.id}: ${
        (err as Error).message
      }`
    )
    await notifyAdmin(container, {
      title: "⚠️ Order cancel failed — needs attention",
      lines: [
        `Order #${order.display_id}`,
        `Auto-cancel after producer no-confirm failed: ${(err as Error).message}`,
      ],
      url: "/app/orders",
    })
    return { cancelled: false }
  }
}

/** Tell the buyer + producer how a producer-confirm failure was resolved. */
export async function notifyResolution(
  container: MedusaContainer,
  order: OrderForConfirm,
  sellerId: string,
  outcome: "cancelled" | "hub_taken"
): Promise<void> {
  if (outcome === "hub_taken") {
    await sendEmail(container, {
      to: order.email,
      template: "order-hub-fulfilling",
      data: { display_id: order.display_id },
    })
    return
  }
  // cancelled
  await sendEmail(container, {
    to: order.email,
    template: "order-cancelled-no-confirm",
    data: { display_id: order.display_id },
  })

  // Producer: inform + strike notice (they can dispute).
  const customerModule = container.resolve(Modules.CUSTOMER)
  const producer = await customerModule
    .retrieveCustomer(sellerId, { select: ["id", "email"] })
    .catch(() => null)
  await sendEmail(container, {
    to: producer?.email,
    template: "producer-order-cancelled",
    data: { display_id: order.display_id },
  })
  await sendPush(container, {
    customerId: sellerId,
    title: "Order cancelled — confirmation missed",
    body: `Order #${order.display_id} was cancelled because it wasn't confirmed in time. A strike was recorded — you can dispute it.`,
    url: "/account/producer/orders",
    tag: `producer-order-${order.id}`,
  })
}

export { buyerName }
