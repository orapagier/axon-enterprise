/**
 * Pure routing of an order's line items to whoever must be told about the sale.
 *
 * Every product carries (on its metadata, stamped at listing time — see
 * /store/seller/products) a `selling_mode`:
 *   - "direct_to_consumer" → the producer is the seller of record. They fulfil
 *     the item themselves, so THEY get notified (keyed by seller_customer_id).
 *   - "sell_to_freshhub" (or anything else / missing) → the hub is the seller
 *     of record (it bought, priced, and stocks the goods). The ADMIN handles it.
 *
 * Extracted from the subscriber so the grouping is unit-testable without an
 * order, products, or the DB.
 */

export type RoutableItem = {
  /** Order line-item id — needed to remove just this line via an order edit. */
  id?: string
  title: string
  quantity: number
  product_id: string | null
}

export type ProductRouteMeta = {
  selling_mode?: unknown
  seller_customer_id?: unknown
}

export type ItemRouting = {
  /** One entry per distinct producer, with that producer's direct items. */
  producers: { sellerId: string; items: RoutableItem[] }[]
  /** Items the hub sells (sell_to_freshhub or unattributed catalog products). */
  hubItems: RoutableItem[]
}

/**
 * Split items into per-producer groups (direct-to-consumer) and a hub bucket.
 * Producer order follows first appearance in `items` for a stable result.
 */
export function routeOrderItems(
  items: RoutableItem[],
  metaByProductId: Map<string, ProductRouteMeta>
): ItemRouting {
  const producerOrder: string[] = []
  const byProducer = new Map<string, RoutableItem[]>()
  const hubItems: RoutableItem[] = []

  for (const item of items) {
    const meta = item.product_id ? metaByProductId.get(item.product_id) : undefined
    const sellerId =
      typeof meta?.seller_customer_id === "string" ? meta.seller_customer_id : null

    if (meta?.selling_mode === "direct_to_consumer" && sellerId) {
      if (!byProducer.has(sellerId)) {
        byProducer.set(sellerId, [])
        producerOrder.push(sellerId)
      }
      byProducer.get(sellerId)!.push(item)
    } else {
      hubItems.push(item)
    }
  }

  return {
    producers: producerOrder.map((sellerId) => ({
      sellerId,
      items: byProducer.get(sellerId)!,
    })),
    hubItems,
  }
}

/** "2× Cavendish Bananas" — one human line per item, for emails/pushes/admin. */
export function formatItemLine(item: RoutableItem): string {
  return `${item.quantity}× ${item.title}`
}
