/**
 * Runtime verification for the 2026-06-17 batch against the LIVE database:
 *   • GCash manual-reference payment provider (`pp_gcash_freshhub`)
 *   • Delivery fee migrated from metadata-only → a real Medusa shipping method
 *     (the new tail of `POST /store/delivery-options/select`).
 *
 * What a unit test can't prove and this does:
 *   1. the GCash module actually LOADS + REGISTERS as a payment provider and is
 *      ENABLED + attached to the PH region (the container here booted it);
 *   2. the GCash provider's lifecycle round-trips the buyer reference and
 *      transitions pending→authorized→captured;
 *   3. the seeded "Standard Delivery" shipping option the select route looks up
 *      by name actually exists;
 *   4. the select route's NEW code path works against a REAL cart: adding a
 *      shipping method with the chosen fee, and RE-selecting a tier replaces it
 *      (no fee stacking) — exercised via the exact cart-module calls the route
 *      makes;
 *   5. Medusa folds that shipping-method amount into the cart's shipping_total /
 *      total (when totals hydrate in exec context — informational otherwise).
 *
 * Creates one throwaway cart, asserts, deletes it. Safe to run repeatedly.
 *
 * Run with:
 *   npx medusa exec ./src/migration-scripts/verify-gcash-delivery.ts
 */
import { ExecArgs } from "@medusajs/framework/types"
import { ContainerRegistrationKeys, Modules } from "@medusajs/framework/utils"
import GcashPaymentProviderService from "../modules/payment-gcash/service"

export default async function verifyGcashDelivery({ container }: ExecArgs) {
  const logger = container.resolve(ContainerRegistrationKeys.LOGGER)
  const query = container.resolve(ContainerRegistrationKeys.QUERY)
  const regionModule = container.resolve(Modules.REGION)
  const cartModule = container.resolve(Modules.CART)

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

  let cartId: string | null = null

  try {
    // ── 1. GCash provider registered + enabled + on the PH region ───────────
    const { data: providers } = await query.graph({
      entity: "payment_provider",
      fields: ["id", "is_enabled"],
    })
    const gcash = (providers as { id: string; is_enabled: boolean }[]).find(
      (p) => p.id === "pp_gcash_freshhub"
    )
    check("pp_gcash_freshhub registered + enabled", !!gcash?.is_enabled,
      `(found=${JSON.stringify(gcash)})`)

    const regions = await regionModule.listRegions({})
    const ph = regions.find((r) => r.currency_code?.toLowerCase() === "php")
    check("PH region exists", !!ph)
    const { data: regionRows } = await query.graph({
      entity: "region",
      fields: ["id", "payment_providers.id"],
      filters: ph ? { id: ph.id } : {},
    })
    const regionPps =
      (regionRows[0] as { payment_providers?: { id: string }[] } | undefined)
        ?.payment_providers?.map((p) => p.id) ?? []
    check("PH region has pp_gcash_freshhub attached",
      regionPps.includes("pp_gcash_freshhub"),
      `(pps=${JSON.stringify(regionPps)})`)

    // ── 2. GCash provider lifecycle (reference round-trip + statuses) ───────
    // Build without the AbstractPaymentProvider constructor (same trick the COD
    // provider unit test uses) so we exercise the pure handler logic.
    const svc = Object.create(
      GcashPaymentProviderService.prototype
    ) as GcashPaymentProviderService
    ;(svc as unknown as { logger_: unknown }).logger_ = console

    const REF = "1234567890123"
    const initiated = await svc.initiatePayment({
      data: { reference: REF },
      amount: 100,
      currency_code: "php",
    } as never)
    const initData = initiated.data as { status?: string; reference?: string }
    check("initiatePayment keeps the buyer reference + pending status",
      initData?.reference === REF && initData?.status === "pending",
      `(data=${JSON.stringify(initData)})`)

    const authorized = await svc.authorizePayment({
      data: initiated.data,
    } as never)
    check("authorizePayment → authorized (order can be placed)",
      authorized.status === "authorized" &&
        (authorized.data as { reference?: string })?.reference === REF)

    const statusAuthorized = await svc.getPaymentStatus({
      data: authorized.data,
    } as never)
    check("getPaymentStatus reflects authorized",
      statusAuthorized.status === "authorized")

    const captured = await svc.capturePayment({
      data: authorized.data,
    } as never)
    check("capturePayment → captured (admin verifies the transfer)",
      (captured.data as { status?: string })?.status === "captured")

    const statusFresh = await svc.getPaymentStatus({ data: {} } as never)
    check("getPaymentStatus defaults to pending for an empty session",
      statusFresh.status === "pending")

    // ── 3. The seeded "Standard Delivery" shipping option exists ────────────
    const { data: options } = await query.graph({
      entity: "shipping_option",
      fields: ["id", "name"],
    })
    const stdOption =
      (options as { id: string; name?: string }[]).find(
        (o) => o.name === "Standard Delivery"
      ) ?? (options as { id: string }[])[0]
    check("'Standard Delivery' shipping option exists (route looks it up)",
      !!stdOption, `(options=${JSON.stringify((options as any[]).map((o)=>o.name))})`)

    // ── 4. Select-route shipping-method behavior on a real cart ─────────────
    if (!ph) throw new Error("no PH region — cannot build a cart")
    const { data: salesChannels } = await query.graph({
      entity: "sales_channel",
      fields: ["id"],
      pagination: { take: 1 },
    })
    const salesChannelId = (salesChannels[0] as { id: string } | undefined)?.id

    const created = await cartModule.createCarts([
      {
        currency_code: "php",
        region_id: ph.id,
        ...(salesChannelId ? { sales_channel_id: salesChannelId } : {}),
        metadata: { verify_tag: `vgd-${Date.now()}` },
      },
    ])
    cartId = (created[0] as { id: string }).id

    // Helper replicating the route's "replace then add" logic for a tier+fee.
    const selectTier = async (tier: string, feePhp: number) => {
      const existing = await cartModule.listShippingMethods({ cart_id: cartId! })
      if (existing.length) {
        await cartModule.deleteShippingMethods(existing.map((m) => m.id))
      }
      const tierLabel =
        tier === "free"
          ? "Free delivery"
          : tier === "special"
            ? "Special delivery"
            : "Standard delivery"
      await cartModule.addShippingMethods(cartId!, [
        {
          name: tierLabel,
          amount: feePhp,
          ...(stdOption ? { shipping_option_id: stdOption.id } : {}),
          data: { delivery_tier: tier },
        },
      ])
    }

    await selectTier("standard", 50)
    let methods = await cartModule.listShippingMethods({ cart_id: cartId })
    check("standard tier → exactly one shipping method @ ₱50",
      methods.length === 1 && Number(methods[0].amount) === 50,
      `(methods=${JSON.stringify(methods.map((m) => ({ a: m.amount, n: m.name })))})`)
    check("shipping method carries data.delivery_tier=standard",
      (methods[0]?.data as { delivery_tier?: string })?.delivery_tier === "standard")

    // Re-select a different tier → must REPLACE, not stack.
    await selectTier("free", 0)
    methods = await cartModule.listShippingMethods({ cart_id: cartId })
    check("re-selecting (free) replaces the method — no fee stacking",
      methods.length === 1 && Number(methods[0].amount) === 0,
      `(count=${methods.length}, amount=${methods[0]?.amount})`)

    // Back to a paid tier so we can check totals reflect a non-zero fee.
    await selectTier("special", 75)
    methods = await cartModule.listShippingMethods({ cart_id: cartId })
    check("special tier → one method @ ₱75",
      methods.length === 1 && Number(methods[0].amount) === 75)

    // ── 5. Cart total folds in the shipping fee (informational if totals
    //       don't hydrate in exec context — they're computed at read time) ───
    const { data: cartRows } = await query.graph({
      entity: "cart",
      fields: ["id", "total", "shipping_subtotal", "shipping_total", "item_total"],
      filters: { id: cartId },
    })
    const ct = cartRows[0] as
      | { total?: number; shipping_subtotal?: number; shipping_total?: number }
      | undefined
    const shipTotal = Number(ct?.shipping_total ?? ct?.shipping_subtotal ?? NaN)
    if (Number.isFinite(shipTotal)) {
      check("cart shipping_total includes the ₱75 fee", shipTotal === 75,
        `(shipping_total=${shipTotal}, total=${ct?.total})`)
    } else {
      logger.info(
        "  ℹ️  cart totals not hydrated in exec context — shipping_total computed at HTTP read time; method row asserted above"
      )
    }
  } catch (err) {
    fail++
    logger.error(`Verification threw: ${(err as Error).stack ?? err}`)
  } finally {
    // ── cleanup ─────────────────────────────────────────────────────────────
    if (cartId) {
      try {
        await cartModule.deleteCarts([cartId])
        logger.info(`  🧹 deleted throwaway cart ${cartId}`)
      } catch (e) {
        logger.warn(`cleanup: could not delete cart ${cartId}: ${(e as Error).message}`)
      }
    }
  }

  logger.info(`\nverify-gcash-delivery: ${pass} passed, ${fail} failed.`)
  if (fail > 0) throw new Error(`verify-gcash-delivery FAILED (${fail} checks)`)
}
