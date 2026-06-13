import type { MedusaContainer } from "@medusajs/framework/types"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"
import { COD_LEDGER_MODULE } from "../modules/cod-ledger"
import type CodLedgerModuleService from "../modules/cod-ledger/service"
import { PRODUCER_PAYOUT_MODULE } from "../modules/producer-payout"
import type ProducerPayoutModuleService from "../modules/producer-payout/service"

/**
 * Producer-payout computation (DTC = hub-collects-then-remits model).
 *
 * For each recent order whose cash has SETTLED (OTC paid, or COD collected +
 * remitted), we attribute its direct-to-consumer line items to the producer
 * that listed them (product.metadata.seller_customer_id / selling_mode), sum
 * the gross per producer, and flag whether a `dtc_remit` payout already exists.
 *
 * Amounts are returned in centavos to match the cod-ledger convention.
 */

const DTC_MODES = new Set(["direct_to_consumer", "direct"])

export type OwedRow = {
  order_id: string
  display_id: number | null
  producer_id: string
  producer_name: string | null
  gross_centavos: number
  paid: boolean
}

type OrderItem = {
  product_id: string | null
  quantity: number | null
  unit_price: number | null
  total: number | null
}

export async function listOwedDtc(
  container: MedusaContainer,
  limit = 200
): Promise<OwedRow[]> {
  const query = container.resolve(ContainerRegistrationKeys.QUERY)
  const ledger: CodLedgerModuleService = container.resolve(COD_LEDGER_MODULE)
  const payoutService: ProducerPayoutModuleService = container.resolve(
    PRODUCER_PAYOUT_MODULE
  )

  const { data: orders } = await query.graph({
    entity: "order",
    fields: [
      "id",
      "display_id",
      "metadata",
      "items.product_id",
      "items.quantity",
      "items.unit_price",
      "items.total",
    ],
    pagination: { take: limit, order: { display_id: "DESC" } },
  })

  if (!orders.length) return []

  const orderIds = orders.map((o) => o.id as string)

  // Batch the cash ledger + existing payouts instead of per-order queries.
  const txns = await ledger.listCodTransactions(
    { order_id: orderIds },
    { take: 10000 }
  )
  const typesByOrder = new Map<string, Set<string>>()
  for (const t of txns) {
    const oid = t.order_id as string | null
    if (!oid) continue
    if (!typesByOrder.has(oid)) typesByOrder.set(oid, new Set())
    typesByOrder.get(oid)!.add(t.type as string)
  }
  const isSettled = (orderId: string): boolean => {
    const types = typesByOrder.get(orderId)
    if (!types) return false
    return (
      types.has("otc_collected") ||
      (types.has("cod_collected") && types.has("rider_remitted"))
    )
  }

  const existingPayouts = await payoutService.listProducerPayouts(
    { order_id: orderIds, kind: "dtc_remit" },
    { take: 10000 }
  )
  const paidKey = new Set(
    existingPayouts.map((p) => `${p.order_id}:${p.producer_id}`)
  )

  // Collect all product ids across DTC-candidate orders, then resolve their
  // metadata (selling_mode + seller_customer_id + seller_name) in one query.
  const settledOrders = orders.filter((o) => isSettled(o.id as string))
  const productIds = new Set<string>()
  for (const o of settledOrders) {
    for (const it of (o.items ?? []) as OrderItem[]) {
      if (it.product_id) productIds.add(it.product_id)
    }
  }
  if (!productIds.size) return []

  const { data: products } = await query.graph({
    entity: "product",
    fields: ["id", "metadata"],
    filters: { id: Array.from(productIds) },
  })
  const productMeta = new Map<string, Record<string, unknown>>()
  for (const p of products) {
    productMeta.set(p.id as string, (p.metadata ?? {}) as Record<string, unknown>)
  }

  const rows: OwedRow[] = []
  for (const o of settledOrders) {
    // Walk-in counter retail is hub-owned, not a DTC producer remittance.
    const saleChannel = (o.metadata as { sale_channel?: string } | null)
      ?.sale_channel
    if (saleChannel === "otc_counter") continue

    const grossByProducer = new Map<
      string,
      { gross: number; name: string | null }
    >()
    for (const it of (o.items ?? []) as OrderItem[]) {
      if (!it.product_id) continue
      const meta = productMeta.get(it.product_id)
      if (!meta) continue
      const mode = String(meta.selling_mode ?? "")
      if (!DTC_MODES.has(mode)) continue
      const producerId = meta.seller_customer_id
      if (typeof producerId !== "string" || !producerId) continue

      const lineMajor =
        typeof it.total === "number"
          ? it.total
          : (it.unit_price ?? 0) * (it.quantity ?? 0)
      const cur = grossByProducer.get(producerId) ?? {
        gross: 0,
        name:
          typeof meta.seller_name === "string" ? meta.seller_name : null,
      }
      cur.gross += lineMajor
      grossByProducer.set(producerId, cur)
    }

    for (const [producerId, { gross, name }] of grossByProducer) {
      rows.push({
        order_id: o.id as string,
        display_id: (o.display_id as unknown as number) ?? null,
        producer_id: producerId,
        producer_name: name,
        gross_centavos: Math.round(gross * 100),
        paid: paidKey.has(`${o.id}:${producerId}`),
      })
    }
  }

  return rows
}
