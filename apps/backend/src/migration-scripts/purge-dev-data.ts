/**
 * Development test-data purge (founder-approved "start really fresh", keep
 * store config). Hard-removes every transactional / test entity so a clean
 * dev DB remains, while KEEPING the operational configuration:
 *
 *   KEEPS:  Philippines region (default), Mindanao Hub + stock location,
 *           sales channel, store, pickup windows, delivery/barangay fees,
 *           shipping options + their price sets, produce categories,
 *           the TRADER-10 promotion.
 *
 *   PURGES: all products + variants + options + images (0 live — all test),
 *           all product-variant price sets (NOT shipping-option price sets),
 *           all inventory items + levels + reservations,
 *           all orders + payment collections + fulfillments,
 *           the COD ledger (cod_transaction), dispatch orders/batches,
 *           refusal disputes, buyer account statuses, pickup slots, riders,
 *           and the leftover seed junk (Europe region + the 4 clothing
 *           categories: Shirts/Sweatshirts/Pants/Merch).
 *
 * Assumes users were already removed (see purge-all-users.ts) so there is no
 * live catalog/order to protect. Idempotent: re-running skips what is gone.
 *
 * Run with:
 *   npx medusa exec ./src/migration-scripts/purge-dev-data.ts
 */
import { ExecArgs } from "@medusajs/framework/types"
import { ContainerRegistrationKeys, Modules } from "@medusajs/framework/utils"
import { COD_LEDGER_MODULE } from "../modules/cod-ledger"
import type CodLedgerModuleService from "../modules/cod-ledger/service"
import { DISPATCH_MODULE } from "../modules/dispatch"
import type DispatchModuleService from "../modules/dispatch/service"
import { ACCOUNTABILITY_MODULE } from "../modules/accountability"
import type AccountabilityModuleService from "../modules/accountability/service"
import { PICKUP_MODULE } from "../modules/pickup"
import type PickupModuleService from "../modules/pickup/service"
import { RIDER_MODULE } from "../modules/rider"
import type RiderModuleService from "../modules/rider/service"

const EUROPE_REGION_ID = "reg_01KRTNCV61T2YPB1N5DA08ATAF"
const JUNK_CATEGORY_IDS = [
  "pcat_01KRTNCVC22QT8EX0XD7499WK7", // Shirts
  "pcat_01KRTNCVC30JQNRFR3WNK2667W", // Sweatshirts
  "pcat_01KRTNCVC4EAS4F82FZNE1NB0R", // Pants
  "pcat_01KRTNCVC4YQJ82PZWAPDKDE9X", // Merch
]
const TAKE = 10000

export default async function purgeDevData({ container }: ExecArgs) {
  const product = container.resolve(Modules.PRODUCT)
  const pricing = container.resolve(Modules.PRICING)
  const inventory = container.resolve(Modules.INVENTORY)
  const order = container.resolve(Modules.ORDER)
  const payment = container.resolve(Modules.PAYMENT)
  const fulfillment = container.resolve(Modules.FULFILLMENT)
  const region = container.resolve(Modules.REGION)
  const query = container.resolve(ContainerRegistrationKeys.QUERY)
  const cod = container.resolve(COD_LEDGER_MODULE) as CodLedgerModuleService
  const dispatch = container.resolve(DISPATCH_MODULE) as DispatchModuleService
  const accountability = container.resolve(
    ACCOUNTABILITY_MODULE
  ) as AccountabilityModuleService
  const pickup = container.resolve(PICKUP_MODULE) as PickupModuleService
  const rider = container.resolve(RIDER_MODULE) as RiderModuleService

  const step = async (label: string, fn: () => Promise<number>) => {
    try {
      const n = await fn()
      console.log(`  ${label}: ${n} removed`)
    } catch (e: any) {
      console.error(`  ${label} FAILED: ${e?.message ?? e}`)
    }
  }
  const idsOf = (rows: Array<{ id: string }>) => rows.map((r) => r.id)

  // ----- 1. Orders + payments + fulfillments (0 live; all test) -----
  await step("orders", async () => {
    const rows = await order.listOrders({}, { select: ["id"], take: TAKE, withDeleted: true })
    if (rows.length) await order.deleteOrders(idsOf(rows))
    return rows.length
  })
  await step("payment collections", async () => {
    const rows = await payment.listPaymentCollections({}, { select: ["id"], take: TAKE })
    if (rows.length) await payment.deletePaymentCollections(idsOf(rows))
    return rows.length
  })
  await step("fulfillments", async () => {
    const rows = await fulfillment.listFulfillments({}, { select: ["id"], take: TAKE })
    // The fulfillment module exposes only a single-id delete (no bulk variant).
    for (const id of idsOf(rows)) await fulfillment.deleteFulfillment(id)
    return rows.length
  })

  // ----- 2. Product-variant price sets (KEEP shipping-option price sets) -----
  await step("variant price sets", async () => {
    // Identify the price sets that belong to shipping options and must survive.
    const shipping = await query.graph(
      { entity: "shipping_option", fields: ["id", "price_set.id"], pagination: { take: TAKE } },
      { throwIfKeyNotFound: false }
    )
    const keep = new Set<string>()
    for (const s of shipping.data ?? []) {
      const ps = (s as { price_set?: { id?: string } }).price_set
      if (ps?.id) keep.add(ps.id)
    }
    const all = await pricing.listPriceSets({}, { select: ["id"], take: TAKE })
    const doomed = all.map((p) => p.id).filter((id) => !keep.has(id))
    if (doomed.length) await pricing.deletePriceSets(doomed)
    return doomed.length
  })

  // ----- 3. Products (cascade variants/options/images) -----
  await step("products", async () => {
    const rows = await product.listProducts({}, { select: ["id"], take: TAKE, withDeleted: true })
    if (rows.length) await product.deleteProducts(idsOf(rows))
    return rows.length
  })

  // ----- 4. Inventory (cascade levels) + reservations -----
  await step("reservations", async () => {
    const rows = await inventory.listReservationItems({}, { select: ["id"], take: TAKE })
    if (rows.length) await inventory.deleteReservationItems(idsOf(rows))
    return rows.length
  })
  await step("inventory items", async () => {
    const rows = await inventory.listInventoryItems({}, { select: ["id"], take: TAKE, withDeleted: true })
    if (rows.length) await inventory.deleteInventoryItems(idsOf(rows))
    return rows.length
  })

  // ----- 5. Custom-module test data -----
  await step("pickup slots", async () => {
    const rows = await pickup.listPickupSlots({}, { select: ["id"], take: TAKE, withDeleted: true })
    if (rows.length) await pickup.deletePickupSlots(idsOf(rows))
    return rows.length
  })
  await step("cod transactions", async () => {
    const rows = await cod.listCodTransactions({}, { select: ["id"], take: TAKE, withDeleted: true })
    if (rows.length) await cod.deleteCodTransactions(idsOf(rows))
    return rows.length
  })
  await step("dispatch orders", async () => {
    const rows = await dispatch.listDispatchOrders({}, { select: ["id"], take: TAKE, withDeleted: true })
    if (rows.length) await dispatch.deleteDispatchOrders(idsOf(rows))
    return rows.length
  })
  await step("dispatch batches", async () => {
    const rows = await dispatch.listDispatchBatches({}, { select: ["id"], take: TAKE, withDeleted: true })
    if (rows.length) await dispatch.deleteDispatchBatches(idsOf(rows))
    return rows.length
  })
  await step("refusal disputes", async () => {
    const rows = await accountability.listRefusalDisputes({}, { select: ["id"], take: TAKE, withDeleted: true })
    if (rows.length) await accountability.deleteRefusalDisputes(idsOf(rows))
    return rows.length
  })
  await step("buyer account statuses", async () => {
    const rows = await accountability.listBuyerAccountStatuses({}, { select: ["id"], take: TAKE, withDeleted: true })
    if (rows.length) await accountability.deleteBuyerAccountStatuses(idsOf(rows))
    return rows.length
  })
  await step("riders", async () => {
    const rows = await rider.listRiders({}, { select: ["id"], take: TAKE, withDeleted: true })
    if (rows.length) await rider.deleteRiders(idsOf(rows))
    return rows.length
  })

  // ----- 6. Seed junk: Europe region + clothing categories -----
  await step("Europe region", async () => {
    const rows = await region.listRegions({ id: EUROPE_REGION_ID }, { select: ["id"] })
    if (rows.length) await region.deleteRegions([EUROPE_REGION_ID])
    return rows.length
  })
  await step("clothing categories", async () => {
    const rows = await product.listProductCategories(
      { id: JUNK_CATEGORY_IDS },
      { select: ["id"] }
    )
    if (rows.length) await product.deleteProductCategories(idsOf(rows))
    return rows.length
  })

  console.log("Dev-data purge done.")
}
