import type { SubscriberArgs, SubscriberConfig } from "@medusajs/framework"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"
import { sendEmail } from "../lib/notify"
import { notifyCustomer } from "../lib/notify-customer"
import { notifyAdmin } from "../lib/notify-admin"
import {
  routeOrderItems,
  formatItemLine,
  type RoutableItem,
  type ProductRouteMeta,
} from "../lib/order-routing"
import {
  initConfirmEntry,
  type ProducerConfirmEntry,
} from "../lib/producer-confirm"
import { persistConfirmEntry } from "../lib/producer-confirm-store"
import type { DeliveryTier } from "../lib/delivery-tiers"

/**
 * On order.placed, tell whoever fulfils each item that it sold:
 *   - direct_to_consumer items → the producer (the seller of record) via email
 *     + web push, so they can prepare/ship their own goods.
 *   - sell_to_freshhub (or unattributed catalog) items → the admin via Telegram,
 *     since the hub is the seller.
 *
 * Separate subscriber from dispatch/confirmation so a notification hiccup never
 * interferes with batching or the buyer's receipt (and vice versa). Best-effort
 * throughout — every send is wrapped by its lib and never throws. OTC walk-in
 * sales are skipped: the goods are handed over at the counter, nothing to fulfil
 * remotely.
 */
export default async function notifySellerOrderHandler({
  event,
  container,
}: SubscriberArgs<{ id: string }>) {
  const logger = container.resolve(ContainerRegistrationKeys.LOGGER)
  const query = container.resolve(ContainerRegistrationKeys.QUERY)

  const orderId = event.data?.id
  if (!orderId) return

  try {
    const { data: orders } = await query.graph({
      entity: "order",
      fields: [
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
      ],
      filters: { id: orderId },
    })
    const order = orders[0] as unknown as
      | {
          id: string
          display_id: number
          email: string | null
          metadata: {
            sale_channel?: string
            delivery_tier?: string
          } | null
          items?: RoutableItem[] | null
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
      | undefined
    if (!order) return

    // Walk-in OTC counter sales are settled at the counter — nothing to route.
    if (order.metadata?.sale_channel === "otc_counter") return

    const items = (order.items ?? []).filter((i) => i && i.title)
    if (!items.length) return

    // Pull each product's selling_mode + seller from its metadata (line-item
    // snapshots don't carry custom product metadata reliably).
    const productIds = [
      ...new Set(items.map((i) => i.product_id).filter(Boolean)),
    ] as string[]
    const metaByProductId = new Map<string, ProductRouteMeta>()
    if (productIds.length) {
      const { data: products } = await query.graph({
        entity: "product",
        fields: ["id", "metadata"],
        filters: { id: productIds },
      })
      for (const p of products as { id: string; metadata?: ProductRouteMeta | null }[]) {
        metaByProductId.set(p.id, (p.metadata ?? {}) as ProductRouteMeta)
      }
    }

    const { producers, hubItems } = routeOrderItems(items, metaByProductId)

    // ----- Notify each producer of their direct-to-consumer items -----
    if (producers.length) {
      const addr = order.shipping_address
      const buyerName = addr
        ? [addr.first_name, addr.last_name].filter(Boolean).join(" ").trim()
        : ""
      const deliverTo = addr
        ? [
            addr.address_1,
            (addr.metadata?.barangay as string | undefined) ?? null,
            addr.city,
            addr.postal_code,
          ]
            .filter(Boolean)
            .join(", ")
        : ""

      // Resolve producer emails in one query.
      const sellerIds = producers.map((p) => p.sellerId)
      const { data: customers } = await query.graph({
        entity: "customer",
        fields: ["id", "email"],
        filters: { id: sellerIds },
      })
      const emailById = new Map(
        (customers as { id: string; email: string | null }[]).map((c) => [
          c.id,
          c.email,
        ])
      )

      // The buyer's chosen tier drives the producer's confirm deadline
      // (special = 10 min, standard/free = 1 hour).
      const VALID_TIERS: DeliveryTier[] = ["free", "standard", "special"]
      const rawTier = order.metadata?.delivery_tier
      const tier: DeliveryTier = VALID_TIERS.includes(rawTier as DeliveryTier)
        ? (rawTier as DeliveryTier)
        : "standard"
      const placedAt = Date.now()

      for (const { sellerId, items: theirItems } of producers) {
        const lines = theirItems.map(formatItemLine)
        await sendEmail(container, {
          to: emailById.get(sellerId),
          template: "producer-order",
          data: {
            display_id: order.display_id,
            items: lines,
            buyer_name: buyerName || null,
            buyer_phone: addr?.phone ?? null,
            deliver_to: deliverTo || null,
          },
        })
        await sendPush(container, {
          customerId: sellerId,
          title: "🛒 New order — confirm to fulfil",
          body: `Order #${order.display_id}: ${lines.join(", ")}. Confirm it before the window closes.`,
          url: "/account/producer/orders",
          tag: `seller-order-${order.id}`,
        })

        // Open the confirmation clock for this producer (the email/push above
        // are the first nudge). The 10-min tick takes it from here.
        const entry: ProducerConfirmEntry = initConfirmEntry(tier, placedAt)
        await persistConfirmEntry(container, order.id, sellerId, entry).catch(
          (err) =>
            logger.warn(
              `notify-seller-order: failed to open confirm window for ${sellerId} on ${order.id}: ${
                (err as Error).message
              }`
            )
        )
      }
    }

    // ----- Notify admin of hub-fulfilled items -----
    if (hubItems.length) {
      await notifyAdmin(container, {
        title: "🧺 New order — hub-fulfilled items",
        lines: [
          `Order #${order.display_id}`,
          ...hubItems.map(formatItemLine),
          order.email && `Buyer: ${order.email}`,
        ],
        url: "/app/orders",
      })
    }
  } catch (err) {
    logger.warn(
      `notify-seller-order failed for ${orderId}: ${(err as Error).message}`
    )
  }
}

export const config: SubscriberConfig = {
  event: "order.placed",
}
