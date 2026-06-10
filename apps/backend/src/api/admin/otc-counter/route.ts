import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { ContainerRegistrationKeys, Modules } from "@medusajs/framework/utils"
import {
  createOrderWorkflow,
  createOrderPaymentCollectionWorkflow,
  markPaymentCollectionAsPaid,
  createOrderFulfillmentWorkflow,
} from "@medusajs/medusa/core-flows"
import type { CreateOrderLineItemDTO } from "@medusajs/framework/types"
import { recordOtcCollected } from "../../../lib/otc-sale"
import { COD_LEDGER_MODULE } from "../../../modules/cod-ledger"
import type CodLedgerModuleService from "../../../modules/cod-ledger/service"

/**
 * /admin/otc-counter — the hub's walk-in (Over the Counter) sales register.
 *
 * Reframe 2026-06-10: OTC is **walk-in only**, not an online payment method. A
 * prepay-locked buyer cannot place an online order; they buy in person at the
 * hub. This route records that counter sale.
 *
 * POST creates a real, **paid**, **dispatch-skipped** Medusa order so the sale
 * gets a receipt, per-customer history, and automatic stock decrement — then
 * writes the `otc_collected` ledger row (hub-held cash, no rider, no remittance).
 * The order carries `metadata.sale_channel = "otc_counter"`, so the order-placed
 * subscriber never puts it on a rider manifest.
 *
 * GET returns today's OTC sales + total for the end-of-day drawer count, kept
 * separate from rider COD reconciliation.
 */

const PH_CURRENCY = "php"
// Asia/Manila is fixed UTC+8 with no DST (same convention as the dispatch jobs).
const MANILA_OFFSET_MS = 8 * 60 * 60_000
// Ledger rows need a non-null customer tag; anonymous walk-ins share this one.
const WALKIN_CUSTOMER = "walkin"

type CounterItem = { variant_id: string; quantity: number }

function actorId(req: MedusaRequest): string | null {
  return (
    (req as unknown as { auth_context?: { actor_id?: string } }).auth_context
      ?.actor_id ?? null
  )
}

export async function POST(req: MedusaRequest, res: MedusaResponse) {
  const query = req.scope.resolve(ContainerRegistrationKeys.QUERY)
  const logger = req.scope.resolve(ContainerRegistrationKeys.LOGGER)

  const body = req.body as {
    customer_id?: string
    email?: string
    items?: CounterItem[]
    payment_reference?: string
    notes?: string
  }

  const items = (body.items ?? []).filter(
    (i) => i?.variant_id && Number(i.quantity) > 0
  )
  if (items.length === 0) {
    res.status(400).json({ error: "At least one item (variant_id + quantity) is required." })
    return
  }

  // 1. Resolve the Philippines region (PHP). Counter sales live in the same
  //    region as online orders.
  const regionModule = req.scope.resolve(Modules.REGION)
  const regions = await regionModule.listRegions({})
  const phRegion = regions.find(
    (r) => r.currency_code?.toLowerCase() === PH_CURRENCY
  )
  if (!phRegion) {
    res.status(500).json({ error: "Philippines (PHP) region not found. Run the region seed first." })
    return
  }

  // 2. Resolve a title per variant (CreateOrderLineItemDTO requires `title`; the
  //    workflow still recomputes price/title from the variant at runtime).
  const { data: variantRows } = await query.graph({
    entity: "variant",
    fields: ["id", "title", "product.title"],
    filters: { id: items.map((i) => i.variant_id) },
  })
  const titleByVariant = new Map<string, string>(
    (
      variantRows as {
        id: string
        title?: string | null
        product?: { title?: string | null } | null
      }[]
    ).map((v) => [v.id, v.title || v.product?.title || "Item"])
  )

  // 3. Create the order. Prices are read from each variant's calculated price.
  //    The metadata flag keeps it out of dispatch.
  const { result: createdOrder } = await createOrderWorkflow(req.scope).run({
    input: {
      region_id: phRegion.id,
      currency_code: PH_CURRENCY,
      customer_id: body.customer_id,
      email: body.email,
      // `unit_price` is intentionally omitted: the workflow reads each
      // variant's calculated (region/tax-aware) price when it isn't supplied
      // (see prepareLineItems in create-order). The DTO marks it required, so
      // cast to satisfy the type without forcing a custom price.
      items: items.map((i) => ({
        variant_id: i.variant_id,
        quantity: Number(i.quantity),
        title: titleByVariant.get(i.variant_id) ?? "Item",
      })) as unknown as CreateOrderLineItemDTO[],
      metadata: { sale_channel: "otc_counter" },
    },
  })

  const orderId = createdOrder.id

  // Re-query for the settled total + line items. The computed `total` only
  // resolves when the order's `summary` and `items` are loaded too — selecting
  // `total` alone returns 0.
  const { data: orderRows } = await query.graph({
    entity: "order",
    fields: [
      "id",
      "customer_id",
      "total",
      "summary.*",
      "items.*",
      "payment_collections.id",
    ],
    filters: { id: orderId },
  })
  const order = orderRows[0] as
    | {
        id: string
        customer_id: string | null
        total: number | string
        summary?: { current_order_total?: number } | null
        items?: { id: string; quantity: number }[]
        payment_collections?: { id: string }[]
      }
    | undefined
  if (!order) {
    res.status(500).json({ error: "Order created but could not be re-read." })
    return
  }

  // Prefer the computed `total`; fall back to the summary total if needed.
  const total = Number(order.total ?? order.summary?.current_order_total ?? 0)
  const amountCentavos = Math.round(total * 100)

  // 4. Mark the order paid via OTC (cash taken at the counter now).
  try {
    let paymentCollectionId = order.payment_collections?.[0]?.id
    if (!paymentCollectionId) {
      const { result: pc } = await createOrderPaymentCollectionWorkflow(
        req.scope
      ).run({ input: { order_id: orderId, amount: total } })
      paymentCollectionId = Array.isArray(pc) ? pc[0]?.id : (pc as { id?: string })?.id
    }
    if (paymentCollectionId) {
      await markPaymentCollectionAsPaid(req.scope).run({
        input: {
          order_id: orderId,
          payment_collection_id: paymentCollectionId,
          captured_by: actorId(req) ?? undefined,
        },
      })
    }
  } catch (err) {
    logger.error(
      `OTC counter sale ${orderId}: failed to mark paid: ${(err as Error).message}`
    )
    res.status(500).json({
      error: `Order ${orderId} was created but could not be marked paid; resolve it in admin before recording cash.`,
    })
    return
  }

  // 5. Record the cash in the ledger (the source of truth for OTC cash).
  const ledgerResult = await recordOtcCollected(req.scope, {
    orderId,
    customerId: order.customer_id ?? WALKIN_CUSTOMER,
    amount: amountCentavos,
    reference: body.payment_reference ?? null,
    notes: body.notes ?? null,
    recordedBy: actorId(req),
  })
  if (!ledgerResult.ok) {
    res.status(ledgerResult.status).json({ error: ledgerResult.error })
    return
  }

  // 6. Decrement stock by fulfilling the handed-over items. Best-effort: a
  //    fulfillment-setup quirk must never void an already-paid, already-ledgered
  //    cash sale — surface a warning so staff can adjust stock manually instead.
  let warning: string | null = null
  try {
    const fulfillItems = (order.items ?? []).map((i) => ({
      id: i.id,
      quantity: i.quantity,
    }))
    if (fulfillItems.length > 0) {
      await createOrderFulfillmentWorkflow(req.scope).run({
        input: { order_id: orderId, items: fulfillItems },
      })
    }
  } catch (err) {
    warning = `Sale recorded, but stock was not auto-decremented (${(err as Error).message}). Adjust inventory manually.`
    logger.warn(`OTC counter sale ${orderId}: ${warning}`)
  }

  res.status(201).json({
    order: { id: orderId, total, amount_centavos: amountCentavos },
    transaction: ledgerResult.transaction,
    warning,
  })
}

export async function GET(req: MedusaRequest, res: MedusaResponse) {
  const ledger: CodLedgerModuleService = req.scope.resolve(COD_LEDGER_MODULE)

  // Start of "today" in Asia/Manila, expressed in UTC.
  const now = new Date()
  const local = new Date(now.getTime() + MANILA_OFFSET_MS)
  const startOfDayUtc = new Date(
    Date.UTC(local.getUTCFullYear(), local.getUTCMonth(), local.getUTCDate()) -
      MANILA_OFFSET_MS
  )

  const rows = await ledger.listCodTransactions(
    { type: "otc_collected", created_at: { $gte: startOfDayUtc } },
    { order: { created_at: "DESC" } }
  )

  const totalCentavos = rows.reduce((sum, r) => sum + Number(r.amount ?? 0), 0)

  res.json({
    date: startOfDayUtc.toISOString(),
    count: rows.length,
    total_centavos: totalCentavos,
    transactions: rows,
  })
}
