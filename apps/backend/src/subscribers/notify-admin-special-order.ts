import type { SubscriberArgs, SubscriberConfig } from "@medusajs/framework"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"
import { notifyAdmin } from "../lib/notify-admin"

/**
 * On order.placed, ping the admin Telegram for URGENT orders only — the
 * "special" delivery tier (Hub-Members ~1h promise). Free/standard orders are
 * not pinged (they'd drown the chat on a busy day); the admin works those from
 * the dispatch board. The founder explicitly scoped order pings to this tier.
 *
 * The buyer-chosen tier is copied cart → order metadata by
 * `copy-delivery-metadata` (same event). Subscriber order isn't guaranteed, so
 * we read the order's metadata and fall back to the source cart's, exactly like
 * that handler, rather than depending on it running first.
 */
export default async function notifyAdminSpecialOrderHandler({
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
      fields: ["id", "display_id", "email", "metadata", "cart_id"],
      filters: { id: orderId },
    })
    const order = orders[0] as unknown as
      | {
          display_id: number
          email: string | null
          metadata: Record<string, unknown> | null
          cart_id: string | null
        }
      | undefined
    if (!order) return

    let meta = (order.metadata ?? {}) as Record<string, unknown>

    // Backfill from the source cart if the delivery keys haven't landed yet.
    if (meta.delivery_tier === undefined && order.cart_id) {
      const { data: carts } = await query.graph({
        entity: "cart",
        fields: ["metadata"],
        filters: { id: order.cart_id },
      })
      const cartMeta = (carts[0] as { metadata?: Record<string, unknown> | null })
        ?.metadata
      if (cartMeta) meta = { ...cartMeta, ...meta }
    }

    if (meta.delivery_tier !== "special") return

    const feePhp = Number(meta.delivery_fee_php ?? 0)
    await notifyAdmin(container, {
      title: "⚡ Special (urgent) delivery order",
      lines: [
        `Order #${order.display_id}`,
        meta.delivery_hub_slug && `Hub: ${meta.delivery_hub_slug}`,
        meta.delivery_barangay && `Barangay: ${meta.delivery_barangay}`,
        feePhp > 0 && `Delivery fee: ₱${feePhp}`,
        order.email && `Buyer: ${order.email}`,
      ],
      url: "/app/dispatch",
    })
  } catch (err) {
    logger.warn(
      `notify-admin-special-order failed for ${orderId}: ${(err as Error).message}`
    )
  }
}

export const config: SubscriberConfig = {
  event: "order.placed",
}
