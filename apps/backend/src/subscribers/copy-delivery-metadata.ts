import type {
  SubscriberArgs,
  SubscriberConfig,
} from "@medusajs/framework"
import {
  ContainerRegistrationKeys,
  Modules,
} from "@medusajs/framework/utils"

/**
 * On order.placed, propagate the buyer-chosen delivery tier from the
 * source cart's metadata to the order's metadata so the dispatch admin
 * page (and any downstream readers) can route the order without having
 * to look back at the cart.
 *
 * Fields copied:
 *   delivery_tier          — "free" | "standard" | "special"
 *   delivery_fee_php       — integer pesos (paid in cash at door for COD)
 *   delivery_barangay      — buyer's barangay
 *   delivery_hub_slug      — fulfilling hub slug
 *
 * Defensive: if Medusa already copied cart.metadata to order.metadata,
 * this is a no-op. If not (or if some keys are missing) we backfill.
 */
export default async function copyDeliveryMetadataHandler({
  event,
  container,
}: SubscriberArgs<{ id: string }>) {
  const logger = container.resolve(ContainerRegistrationKeys.LOGGER)
  const query = container.resolve(ContainerRegistrationKeys.QUERY)
  const orderModule = container.resolve(Modules.ORDER)

  const orderId = event.data?.id
  if (!orderId) {
    logger.warn("order.placed (copy-delivery-metadata) without id; skipping.")
    return
  }

  try {
    const { data: orders } = await query.graph({
      entity: "order",
      fields: ["id", "metadata", "cart_id"],
      filters: { id: orderId },
    })
    const order = orders[0] as
      | {
          id: string
          metadata: Record<string, unknown> | null
          cart_id: string | null
        }
      | undefined
    if (!order) {
      logger.warn(`Order ${orderId} not found for delivery metadata copy.`)
      return
    }

    const orderMeta = (order.metadata ?? {}) as Record<string, unknown>

    // Short-circuit: if all 4 keys already present on the order, nothing to do.
    const KEYS = [
      "delivery_tier",
      "delivery_fee_php",
      "delivery_barangay",
      "delivery_hub_slug",
    ] as const
    if (KEYS.every((k) => orderMeta[k] !== undefined)) return

    if (!order.cart_id) return

    const { data: carts } = await query.graph({
      entity: "cart",
      fields: ["id", "metadata"],
      filters: { id: order.cart_id },
    })
    const cart = carts[0] as
      | { metadata: Record<string, unknown> | null }
      | undefined
    const cartMeta = (cart?.metadata ?? {}) as Record<string, unknown>

    const patch: Record<string, unknown> = { ...orderMeta }
    let changed = false
    for (const k of KEYS) {
      if (patch[k] === undefined && cartMeta[k] !== undefined) {
        patch[k] = cartMeta[k]
        changed = true
      }
    }
    if (!changed) return

    await orderModule.updateOrders([{ id: orderId, metadata: patch }])
    logger.info(
      `Order ${orderId}: copied delivery metadata (tier=${patch.delivery_tier}, fee=${patch.delivery_fee_php}).`
    )
  } catch (err) {
    logger.error(
      `Failed to copy delivery metadata for order ${orderId}: ${(err as Error).message}`
    )
  }
}

export const config: SubscriberConfig = {
  event: "order.placed",
}
