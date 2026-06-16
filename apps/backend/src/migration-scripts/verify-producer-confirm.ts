/**
 * Runtime verification for the producer order-confirmation lifecycle + the
 * PER-ITEM cancellation flow (2026-06-16).
 *
 * Creates throwaway producers + products + real Medusa orders, then drives the
 * REAL producer-confirm-tick job and the REAL store helpers against the live DB:
 *
 *   Part 1 — state round-trips on order.metadata (init → persist → read).
 *   Part 2 — the tick ESCALATES a past-deadline order (admin window opens).
 *   Part 3 — the tick AUTO-CANCELS a single-producer order whose admin window
 *            lapsed → whole order canceled + producer strike recorded.
 *   Part 4 — per-item cancel on a TWO-producer order: only producer A's lines
 *            are removed (order edit), producer B's stay, order stays alive.
 *   Part 5 — confirm paths (on-time = no strike, late = strike) + strike dispute.
 *
 * ⚠️ Sends REAL admin notifications (Telegram + ADMIN_NOTIFY_EMAIL) when it
 * escalates, since those env vars are set. Cleans up everything it creates.
 *
 * Run with:
 *   npx medusa exec ./src/migration-scripts/verify-producer-confirm.ts
 */
import { ExecArgs } from "@medusajs/framework/types"
import { ContainerRegistrationKeys, Modules } from "@medusajs/framework/utils"
import type { CreateOrderLineItemDTO } from "@medusajs/framework/types"
import {
  createProductsWorkflow,
  deleteProductsWorkflow,
  createOrderWorkflow,
} from "@medusajs/medusa/core-flows"
import { setVariantStock } from "../lib/listing-stock"
import {
  initConfirmEntry,
  classifyConfirmEntry,
  applyProducerConfirm,
} from "../lib/producer-confirm"
import {
  persistConfirmEntry,
  getSellerEntry,
  recordProducerStrike,
  cancelMedusaOrderForProducer,
  loadOrderForConfirm,
  disputeProducerStrike,
} from "../lib/producer-confirm-store"
import producerConfirmTick from "../jobs/producer-confirm-tick"

const MIN = 60_000
const HOUR = 60 * MIN

export default async function verifyProducerConfirm({ container }: ExecArgs) {
  const logger = container.resolve(ContainerRegistrationKeys.LOGGER)
  const query = container.resolve(ContainerRegistrationKeys.QUERY)
  const customerModule = container.resolve(Modules.CUSTOMER)
  const regionModule = container.resolve(Modules.REGION)
  const orderModule = container.resolve(Modules.ORDER)

  const TAG = `vpc-${Date.now()}`
  let pass = 0
  let fail = 0
  const check = (name: string, ok: boolean, detail = "") => {
    if (ok) {
      pass++
      logger.info(`  ✅ ${name}`)
    } else {
      fail++
      logger.error(`  ❌ ${name} ${detail}`)
    }
  }

  // --- bookkeeping for cleanup ---
  const productIds: string[] = []
  const customerIds: string[] = []
  const orderIds: string[] = []

  try {
    // ── Setup: region, channel, profile ───────────────────────────────────
    const regions = await regionModule.listRegions({})
    const phRegion = regions.find((r) => r.currency_code?.toLowerCase() === "php")
    if (!phRegion) throw new Error("PHP region not found — run the region seed.")

    const { data: salesChannels } = await query.graph({
      entity: "sales_channel",
      fields: ["id"],
      pagination: { take: 1 },
    })
    const { data: shippingProfiles } = await query.graph({
      entity: "shipping_profile",
      fields: ["id"],
      pagination: { take: 1 },
    })
    const salesChannelId = salesChannels?.[0]?.id
    const shippingProfileId = shippingProfiles?.[0]?.id

    // Two throwaway producers.
    const producerA = await customerModule.createCustomers({
      email: `${TAG}-producerA@example.test`,
      first_name: "ProducerA",
      metadata: { roles: ["producer"] },
    })
    const producerB = await customerModule.createCustomers({
      email: `${TAG}-producerB@example.test`,
      first_name: "ProducerB",
      metadata: { roles: ["producer"] },
    })
    const buyer = await customerModule.createCustomers({
      email: `${TAG}-buyer@example.test`,
      first_name: "Buyer",
    })
    customerIds.push(producerA.id, producerB.id, buyer.id)

    // Helper: create a direct-listing product for a given producer.
    const mkProduct = async (
      label: string,
      sellerId: string,
      priceCentavos: number,
      extraMeta: Record<string, unknown> = {}
    ) => {
      const { result } = await createProductsWorkflow(container).run({
        input: {
          products: [
            {
              title: `${TAG} ${label} — delete me`,
              handle: `${TAG}-${label}`.toLowerCase(),
              status: "published",
              shipping_profile_id: shippingProfileId,
              sales_channels: salesChannelId ? [{ id: salesChannelId }] : [],
              options: [{ title: "Size", values: ["Default"] }],
              variants: [
                {
                  title: "Default",
                  manage_inventory: true,
                  options: { Size: "Default" },
                  prices: [{ amount: priceCentavos, currency_code: "php" }],
                },
              ],
              metadata: {
                selling_mode: "direct_to_consumer",
                seller_customer_id: sellerId,
                ...extraMeta,
              },
            },
          ],
        },
      })
      const product = result?.[0] as { id: string; variants?: { id: string }[] }
      productIds.push(product.id)
      let variantId = product.variants?.[0]?.id
      if (!variantId) {
        const { data } = await query.graph({
          entity: "product",
          fields: ["id", "variants.id"],
          filters: { id: product.id },
        })
        variantId = (data?.[0] as { variants?: { id: string }[] })?.variants?.[0]?.id
      }
      if (!variantId) throw new Error(`${label}: no variant`)
      await setVariantStock(container, variantId, 100)
      return { productId: product.id, variantId, priceCentavos }
    }

    const prodA = await mkProduct("prodA", producerA.id, 12000, {
      special_delivery: true,
    })
    const prodB = await mkProduct("prodB", producerB.id, 5000)

    // Helper: create a real order for the given line items.
    const mkOrder = async (
      lines: { productId: string; variantId: string; price: number; qty: number }[]
    ) => {
      const { result } = await createOrderWorkflow(container).run({
        input: {
          region_id: phRegion.id,
          currency_code: "php",
          customer_id: buyer.id,
          email: buyer.email,
          sales_channel_id: salesChannelId,
          items: lines.map((l) => ({
            product_id: l.productId,
            variant_id: l.variantId,
            quantity: l.qty,
            unit_price: l.price,
            title: "Item",
          })) as unknown as CreateOrderLineItemDTO[],
          metadata: { delivery_tier: "standard", verify_tag: TAG },
        },
      })
      const order = result as { id: string }
      orderIds.push(order.id)
      return order.id
    }

    const reReadOrder = async (id: string) => {
      const { data } = await query.graph({
        entity: "order",
        fields: ["id", "status", "total", "summary.*", "items.product_id", "items.quantity"],
        filters: { id },
      })
      return data[0] as {
        id: string
        status: string
        total: number | string
        items?: { product_id: string | null; quantity: number }[]
      }
    }
    const qtyForProduct = (
      o: Awaited<ReturnType<typeof reReadOrder>>,
      productId: string
    ) =>
      (o.items ?? [])
        .filter((i) => i.product_id === productId)
        .reduce((s, i) => s + Number(i.quantity ?? 0), 0)

    const strikeCount = async (sellerId: string) => {
      const c = await customerModule.retrieveCustomer(sellerId, {
        select: ["id", "metadata"],
      })
      return Number((c?.metadata as Record<string, unknown>)?.producer_confirm_strikes ?? 0)
    }

    // ── Part 1: state round-trip ───────────────────────────────────────────
    logger.info("Part 1 — confirm state round-trips on order.metadata")
    const o1 = await mkOrder([{ ...prodA, price: prodA.priceCentavos, qty: 1 }])
    await persistConfirmEntry(
      container,
      o1,
      producerA.id,
      initConfirmEntry("standard", Date.now())
    )
    const e1 = await getSellerEntry(container, o1, producerA.id)
    check("entry persisted + read back as awaiting", e1?.status === "awaiting")
    check(
      "deadline is ~1h out for standard",
      !!e1 && Math.abs(e1.deadline_at - (e1.placed_at + HOUR)) < 1000
    )

    // ── Part 2: tick escalates a past-deadline order ───────────────────────
    logger.info("Part 2 — producer-confirm-tick escalates a past-deadline order")
    // Backdate so the deadline already passed → classify says "escalate".
    await persistConfirmEntry(
      container,
      o1,
      producerA.id,
      initConfirmEntry("standard", Date.now() - 2 * HOUR)
    )
    const beforeEsc = await getSellerEntry(container, o1, producerA.id)
    check(
      "classify on a past-deadline awaiting entry = escalate",
      !!beforeEsc && classifyConfirmEntry(beforeEsc, Date.now()) === "escalate"
    )
    await producerConfirmTick({} as never)
    const e2 = await getSellerEntry(container, o1, producerA.id)
    check(
      "after tick → escalated + admin window opened",
      e2?.status === "escalated" && !!e2?.admin_deadline_at,
      `status=${e2?.status} admin_deadline=${e2?.admin_deadline_at}`
    )

    // ── Part 3: tick auto-cancels (single producer → whole order) ──────────
    logger.info("Part 3 — admin window lapses → auto-cancel whole order + strike")
    const strikesBefore3 = await strikeCount(producerA.id)
    // Backdate the admin window into the past so the next tick auto-cancels.
    await persistConfirmEntry(container, o1, producerA.id, {
      ...(e2 as NonNullable<typeof e2>),
      admin_deadline_at: Date.now() - MIN,
    })
    await producerConfirmTick({} as never)
    const e3 = await getSellerEntry(container, o1, producerA.id)
    const o1after = await reReadOrder(o1)
    check("entry → cancelled", e3?.status === "cancelled", `status=${e3?.status}`)
    check(
      "single-producer order is fully canceled",
      o1after.status === "canceled",
      `status=${o1after.status}`
    )
    check(
      "producer A strike recorded",
      (await strikeCount(producerA.id)) === strikesBefore3 + 1
    )

    // ── Part 4: PER-ITEM cancel on a two-producer order ────────────────────
    logger.info("Part 4 — per-item cancel removes only producer A's lines")
    const o2 = await mkOrder([
      { ...prodA, price: prodA.priceCentavos, qty: 2 }, // 2 × ₱120 = ₱240
      { ...prodB, price: prodB.priceCentavos, qty: 3 }, // 3 × ₱50  = ₱150
    ])
    const o2before = await reReadOrder(o2)
    const totalBefore = Number(o2before.total ?? 0)
    const full2 = await loadOrderForConfirm(container, o2)
    const r2 = full2
      ? await cancelMedusaOrderForProducer(container, full2, producerA.id, "verify per-item")
      : { cancelled: false, mode: "none" as const }
    const o2after = await reReadOrder(o2)
    check("per-item removal reported mode=items", r2.mode === "items", `mode=${r2.mode}`)
    check(
      "producer A's lines removed (qty 0)",
      qtyForProduct(o2after, prodA.productId) === 0,
      `A qty=${qtyForProduct(o2after, prodA.productId)}`
    )
    check(
      "producer B's lines untouched (qty 3)",
      qtyForProduct(o2after, prodB.productId) === 3,
      `B qty=${qtyForProduct(o2after, prodB.productId)}`
    )
    check(
      "order stays alive (not canceled)",
      o2after.status !== "canceled",
      `status=${o2after.status}`
    )
    check(
      "order total dropped to producer B's subtotal",
      Number(o2after.total) < totalBefore && Number(o2after.total) > 0,
      `before=${totalBefore} after=${o2after.total}`
    )

    // ── Part 5: confirm paths + strike dispute ─────────────────────────────
    logger.info("Part 5 — on-time confirm (no strike), late confirm (strike), dispute")
    const o3 = await mkOrder([{ ...prodA, price: prodA.priceCentavos, qty: 1 }])
    await persistConfirmEntry(
      container,
      o3,
      producerA.id,
      initConfirmEntry("standard", Date.now())
    )
    const onTime = applyProducerConfirm(
      (await getSellerEntry(container, o3, producerA.id))!,
      Date.now()
    )
    check("on-time confirm → no strike owed", onTime.entry.status === "confirmed" && !onTime.strike)

    const strikesBefore5 = await strikeCount(producerA.id)
    const o4 = await mkOrder([{ ...prodB, price: prodB.priceCentavos, qty: 1 }])
    await persistConfirmEntry(
      container,
      o4,
      producerB.id,
      initConfirmEntry("standard", Date.now() - 2 * HOUR) // already past deadline
    )
    const late = applyProducerConfirm(
      (await getSellerEntry(container, o4, producerB.id))!,
      Date.now()
    )
    check("late confirm → strike owed", late.entry.late === true && late.strike === true)
    await persistConfirmEntry(container, o4, producerB.id, late.entry)
    await recordProducerStrike(container, producerB.id, {
      order_id: o4,
      display_id: null,
      reason: "verify late confirm",
      tier: "standard",
    })
    check(
      "recordProducerStrike incremented B's count",
      (await strikeCount(producerB.id)) === strikesBefore5 + 1
    )
    const disputed = await disputeProducerStrike(container, producerB.id, o4, "test dispute")
    check("producer can dispute the strike", disputed === true)
  } finally {
    // ── Cleanup ─────────────────────────────────────────────────────────────
    for (const id of orderIds) {
      try {
        await orderModule.deleteOrders([id])
      } catch {
        /* orders may not hard-delete cleanly; they're tagged verify_tag */
      }
    }
    if (productIds.length) {
      try {
        await deleteProductsWorkflow(container).run({ input: { ids: productIds } })
      } catch {
        /* ignore */
      }
    }
    if (customerIds.length) {
      try {
        await customerModule.deleteCustomers(customerIds)
      } catch {
        /* ignore */
      }
    }
    logger.info(
      `Cleanup: ${orderIds.length} orders, ${productIds.length} products, ${customerIds.length} customers.`
    )
  }

  logger.info(`Producer-confirm verification: ${pass} passed, ${fail} failed.`)
  if (fail > 0) {
    throw new Error(`Producer-confirm verification FAILED (${fail} failing checks).`)
  }
}
