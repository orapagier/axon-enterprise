/**
 * One-time cleanup for the order-fulfillment "Location" dropdown.
 *
 * Before add-philippines-region.ts became idempotent, repeated runs created
 * duplicate "Mindanao Hub" stock locations. The default Medusa seed also
 * created a demo "European Warehouse" that is irrelevant to this PH-only store.
 * Both clutter the location dropdown on the order fulfillment screen.
 *
 * This keeps a single canonical Mindanao Hub — the one holding the most
 * inventory (tie-break: a PH address, then the oldest) — soft-deletes every
 * other Mindanao Hub plus the European Warehouse, and re-wires the survivor to
 * the default sales channel, the manual fulfillment provider, and the PH
 * fulfillment set so fulfillment keeps working.
 *
 * Soft-delete is recoverable. Idempotent: re-running is a no-op once cleaned.
 *
 * Run with:
 *   npx medusa exec ./src/migration-scripts/cleanup-stock-locations.ts
 */
import { ExecArgs } from "@medusajs/framework/types"
import {
  ContainerRegistrationKeys,
  Modules,
} from "@medusajs/framework/utils"
import {
  deleteStockLocationsWorkflow,
  linkSalesChannelsToStockLocationWorkflow,
} from "@medusajs/medusa/core-flows"

const PH = "ph"

type Loc = {
  id: string
  name: string
  created_at?: string | Date | null
  address?: { country_code?: string | null } | null
}

export default async function cleanupStockLocations({ container }: ExecArgs) {
  const logger = container.resolve(ContainerRegistrationKeys.LOGGER)
  const link = container.resolve(ContainerRegistrationKeys.LINK)
  const stockLocationModule = container.resolve(Modules.STOCK_LOCATION)
  const salesChannelModule = container.resolve(Modules.SALES_CHANNEL)
  const fulfillmentModule = container.resolve(Modules.FULFILLMENT)
  const inventoryModule = container.resolve(Modules.INVENTORY)
  const storeModule = container.resolve(Modules.STORE)

  const locations = (await stockLocationModule.listStockLocations(
    {},
    { relations: ["address"] }
  )) as unknown as Loc[]
  logger.info(`Found ${locations.length} stock location(s).`)

  const isPh = (l: Loc) => l.address?.country_code?.toLowerCase() === PH
  const isMindanao = (l: Loc) => l.name === "Mindanao Hub" || isPh(l)

  const mindanaoHubs = locations.filter(isMindanao)
  const europeWarehouses = locations.filter(
    (l) => l.name === "European Warehouse"
  )

  // Count inventory levels per Mindanao Hub so we keep the one with real stock.
  const levelCount = new Map<string, number>()
  if (mindanaoHubs.length > 1) {
    const levels = await inventoryModule.listInventoryLevels(
      { location_id: mindanaoHubs.map((l) => l.id) },
      { take: 1_000_000, select: ["location_id"] }
    )
    for (const lvl of levels as { location_id: string }[]) {
      levelCount.set(lvl.location_id, (levelCount.get(lvl.location_id) ?? 0) + 1)
    }
  }

  // Keeper ranking: most inventory → PH-addressed → oldest.
  mindanaoHubs.sort((a, b) => {
    const invA = levelCount.get(a.id) ?? 0
    const invB = levelCount.get(b.id) ?? 0
    if (invB !== invA) return invB - invA
    const phA = isPh(a) ? 1 : 0
    const phB = isPh(b) ? 1 : 0
    if (phB !== phA) return phB - phA
    return (
      new Date(a.created_at ?? 0).getTime() -
      new Date(b.created_at ?? 0).getTime()
    )
  })
  const keeper = mindanaoHubs[0] ?? null

  if (mindanaoHubs.length === 0) {
    logger.warn(
      "No Mindanao Hub found. Run add-philippines-region.ts first; nothing to dedupe."
    )
  } else {
    logger.info(
      `Keeping Mindanao Hub: ${keeper!.id} ` +
        `(stock entries: ${levelCount.get(keeper!.id) ?? 0}, ph: ${isPh(keeper!)}).`
    )
  }

  const toDelete = [
    ...mindanaoHubs.filter((l) => l.id !== keeper?.id),
    ...europeWarehouses,
  ]
  const deleteIds = [...new Set(toDelete.map((l) => l.id))]

  if (deleteIds.length === 0) {
    logger.info("Nothing to delete — location list is already clean. ✅")
  } else {
    logger.info(
      `Soft-deleting ${deleteIds.length} location(s): ` +
        toDelete.map((l) => `${l.name} (${l.id})`).join(", ")
    )
    await deleteStockLocationsWorkflow(container).run({
      input: { ids: deleteIds },
    })
    logger.info("Deleted duplicate / demo stock locations.")
  }

  if (!keeper) {
    logger.info("Cleanup finished (no Mindanao Hub to re-link).")
    return
  }

  // ── Re-wire the survivor so fulfillment keeps working ──────────────

  // 1. Default sales channel (so the hub shows for store orders). The default
  // is tracked on the store, not the sales channel itself.
  const stores = await storeModule.listStores({})
  const defaultScId = (
    stores[0] as { default_sales_channel_id?: string } | undefined
  )?.default_sales_channel_id
  const salesChannels = await salesChannelModule.listSalesChannels({})
  const defaultSc =
    (defaultScId && salesChannels.find((s) => s.id === defaultScId)) ||
    salesChannels.find((s) => s.name === "Default Sales Channel") ||
    salesChannels[0]
  if (defaultSc) {
    try {
      await linkSalesChannelsToStockLocationWorkflow(container).run({
        input: { id: keeper.id, add: [defaultSc.id] },
      })
      logger.info(`Linked keeper to sales channel "${defaultSc.name}".`)
    } catch (err) {
      logger.info(`Sales-channel link already present: ${String(err)}`)
    }
  }

  // 2. Manual fulfillment provider.
  try {
    await link.create({
      [Modules.STOCK_LOCATION]: { stock_location_id: keeper.id },
      [Modules.FULFILLMENT]: { fulfillment_provider_id: "manual_manual" },
    })
    logger.info("Linked keeper to manual_manual fulfillment provider.")
  } catch (err) {
    logger.info(`Provider link already present: ${String(err)}`)
  }

  // 3. PH fulfillment set.
  const phSets = await fulfillmentModule.listFulfillmentSets({
    name: "Philippines delivery",
  })
  const phSet = phSets[0]
  if (phSet) {
    try {
      await link.create({
        [Modules.STOCK_LOCATION]: { stock_location_id: keeper.id },
        [Modules.FULFILLMENT]: { fulfillment_set_id: phSet.id },
      })
      logger.info('Linked keeper to "Philippines delivery" fulfillment set.')
    } catch (err) {
      logger.info(`Fulfillment-set link already present: ${String(err)}`)
    }
  }

  logger.info("✅ Stock-location cleanup complete.")
}
