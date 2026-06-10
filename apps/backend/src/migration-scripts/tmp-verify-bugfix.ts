import type { ExecArgs } from "@medusajs/framework/types"
import { Modules } from "@medusajs/framework/utils"
import { createOrderWorkflow } from "@medusajs/medusa/core-flows"
import type { CreateOrderLineItemDTO } from "@medusajs/framework/types"
import { DISPATCH_MODULE } from "../modules/dispatch"
import type DispatchModuleService from "../modules/dispatch/service"
import { ACCOUNTABILITY_MODULE } from "../modules/accountability"
import type AccountabilityModuleService from "../modules/accountability/service"

/**
 * TEMPORARY — runtime-verification fixture for the 2026-06-10 bug-fix pass.
 * Creates two COD orders carrying a ₱30 metadata delivery fee, an in-transit
 * dispatch batch (order A assigned to the rider passed as arg, order B
 * unassigned), and accountability rows for the warned-recovery test.
 * Delete this file after verification.
 *
 * Usage: npx medusa exec ./src/migration-scripts/tmp-verify-bugfix.ts <rider_id>
 */
export default async function verifyFixture({ container, args }: ExecArgs) {
  const riderId = args?.[0]
  if (!riderId) throw new Error("usage: ... tmp-verify-bugfix.ts <rider_id>")

  const HUB_ID = "01KS4TYKE280NSH40MSEN5QV9J"
  const REGION_ID = "reg_01KRXKWN61270WSFQRN64SY5BG"
  const CUSTOMER_ID = "cus_01KS79Y9XTGSAD93E63XY9B68E"
  const VARIANT_ID = "variant_01KSGKYD39EE3CY5BC0N6NJPQ7" // Potato

  const makeOrder = async (label: string) => {
    const { result } = await createOrderWorkflow(container).run({
      input: {
        region_id: REGION_ID,
        currency_code: "php",
        customer_id: CUSTOMER_ID,
        email: "cod-test-1779435513@freshhub.local",
        items: [
          { variant_id: VARIANT_ID, quantity: 1, title: "Potato" },
        ] as unknown as CreateOrderLineItemDTO[],
        metadata: {
          delivery_tier: "standard",
          delivery_fee_php: 30,
          verify_label: label,
        },
      },
    })
    return result.id
  }

  const orderA = await makeOrder("VERIFY-A")
  const orderB = await makeOrder("VERIFY-B")

  const dispatch: DispatchModuleService = container.resolve(DISPATCH_MODULE)
  const now = Date.now()
  const batch = await dispatch.createDispatchBatches({
    hub_id: HUB_ID,
    dispatch_date: new Date(now - 8 * 60 * 60 * 1000),
    cutoff_at: new Date(now - 60 * 60 * 1000),
    status: "in_transit",
    dispatched_at: new Date(),
  })
  const doA = await dispatch.createDispatchOrders({
    dispatch_batch: batch.id,
    order_id: orderA,
    manifest_position: 0,
    delivery_status: "pending",
    rider_id: riderId,
  })
  const doB = await dispatch.createDispatchOrders({
    dispatch_batch: batch.id,
    order_id: orderB,
    manifest_position: 1,
    delivery_status: "pending",
  })

  // Warned buyer, recovery clock already expired, no clean order yet —
  // delivering order A should stamp last_clean_order_at, after which
  // clean-order-tick must recover them to normal.
  const accountability: AccountabilityModuleService =
    container.resolve(ACCOUNTABILITY_MODULE)
  const [existing] = await accountability.listBuyerAccountStatuses(
    { customer_id: CUSTOMER_ID },
    { take: 1 }
  )
  const warnedFields = {
    state: "warned" as const,
    strike_count: 1,
    state_until: null,
    recovery_eligible_at: new Date(now - 24 * 60 * 60 * 1000),
    last_clean_order_at: null,
  }
  if (existing) {
    await accountability.updateBuyerAccountStatuses({
      id: existing.id,
      ...warnedFields,
    })
  } else {
    await accountability.createBuyerAccountStatuses({
      customer_id: CUSTOMER_ID,
      ...warnedFields,
    })
  }

  // Legacy warned row (pre-fix: no recovery_eligible_at) — the tick must
  // self-heal it by stamping a clock, not recover it.
  const LEGACY_ID = "verify-legacy-warned"
  const [legacy] = await accountability.listBuyerAccountStatuses(
    { customer_id: LEGACY_ID },
    { take: 1 }
  )
  if (!legacy) {
    await accountability.createBuyerAccountStatuses({
      customer_id: LEGACY_ID,
      state: "warned",
      strike_count: 1,
      recovery_eligible_at: null,
      last_clean_order_at: null,
    })
  } else {
    await accountability.updateBuyerAccountStatuses({
      id: legacy.id,
      state: "warned",
      strike_count: 1,
      recovery_eligible_at: null,
      last_clean_order_at: null,
    })
  }

  // Order totals for the assertion phase.
  const orderModule = container.resolve(Modules.ORDER)
  const totals: Record<string, unknown> = {}
  for (const [label, id] of [
    ["A", orderA],
    ["B", orderB],
  ] as const) {
    const o = await orderModule.retrieveOrder(id, {
      select: ["id", "display_id"],
    })
    totals[label] = { id, display_id: o.display_id }
  }

  console.log(
    "FIXTURE " +
      JSON.stringify({
        orders: totals,
        batch: batch.id,
        dispatch_order_A: doA.id,
        dispatch_order_B: doB.id,
      })
  )
}
