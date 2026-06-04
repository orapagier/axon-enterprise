/**
 * One-time cleanup for the order-fulfillment "Location" dropdown.
 *
 * History: repeated runs of add-philippines-region.ts (before it became
 * idempotent) created several empty "Mindanao Hub" stock locations, while the
 * actual product inventory + sales-channel link still live on the default
 * Medusa demo location ("European Warehouse"). The empty hubs clutter the
 * location dropdown on the order fulfillment screen.
 *
 * This consolidates to a single canonical hub:
 *   1. Picks a keeper — the location with the most *active* inventory levels
 *      wins; ties break to a PH address, then the oldest row. (If inventory has
 *      been cleared, the PH-addressed/oldest hub is kept.)
 *   2. Renames the keeper to "Mindanao Hub" with a PH address if it isn't
 *      already — preserving its inventory and sales-channel link.
 *   3. Soft-deletes every other stock location (the empty Mindanao Hub
 *      duplicates and the demo "European Warehouse"), which also removes their
 *      fulfillment-set / provider links so they drop out of the dropdown.
 *   4. Re-wires the keeper to the default sales channel, the manual
 *      fulfillment provider, and the PH "Philippines delivery" fulfillment set.
 *
 * Soft-delete + rename are recoverable. Idempotent: a no-op once cleaned.
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
  updateStockLocationsWorkflow,
} from "@medusajs/medusa/core-flows"

const PH = "ph"
const HUB_NAME = "Mindanao Hub"

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
  logger.info(`Found ${locations.length} active stock location(s).`)

  if (locations.length === 0) {
    logger.warn("No stock locations found. Run add-philippines-region.ts first.")
    return
  }

  const isPh = (l: Loc) => l.address?.country_code?.toLowerCase() === PH

  // Count inventory levels per location so the keeper is the one with real stock.
  const levelCount = new Map<string, number>()
  const levels = await inventoryModule.listInventoryLevels(
    { location_id: locations.map((l) => l.id) },
    { take: 1_000_000 }
  )
  for (const lvl of levels as { location_id: string }[]) {
    levelCount.set(lvl.location_id, (levelCount.get(lvl.location_id) ?? 0) + 1)
  }

  // Keeper ranking: most inventory → PH-addressed → oldest.
  const ranked = [...locations].sort((a, b) => {
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
  const keeper = ranked[0]
  logger.info(
    `Keeping "${keeper.name}" (${keeper.id}) — ` +
      `${levelCount.get(keeper.id) ?? 0} inventory level(s). Renaming to "${HUB_NAME}".`
  )

  // ── 1. Soft-delete every other location (workflow removes their links) ──
  const deleteIds = locations
    .filter((l) => l.id !== keeper.id)
    .map((l) => l.id)
  if (deleteIds.length === 0) {
    logger.info("No duplicate locations to delete.")
  } else {
    logger.info(
      `Soft-deleting ${deleteIds.length} location(s): ${deleteIds.join(", ")}`
    )
    await deleteStockLocationsWorkflow(container).run({
      input: { ids: deleteIds },
    })
  }

  // ── 2. Rename + PH-ify the keeper (preserves inventory & links) ─────────
  if (keeper.name !== HUB_NAME || !isPh(keeper)) {
    await updateStockLocationsWorkflow(container).run({
      input: {
        selector: { id: keeper.id },
        update: {
          name: HUB_NAME,
          address: {
            city: "Davao City",
            country_code: "PH",
            address_1: "Mindanao Fresh Hub Warehouse",
          },
        },
      },
    })
    logger.info(`Renamed keeper to "${HUB_NAME}" with a PH address.`)
  }

  // ── 3. Ensure the keeper's links so fulfillment keeps working ───────────

  // Default sales channel (tracked on the store, not the channel).
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

  // Manual fulfillment provider.
  try {
    await link.create({
      [Modules.STOCK_LOCATION]: { stock_location_id: keeper.id },
      [Modules.FULFILLMENT]: { fulfillment_provider_id: "manual_manual" },
    })
    logger.info("Linked keeper to manual_manual fulfillment provider.")
  } catch (err) {
    logger.info(`Provider link already present: ${String(err)}`)
  }

  // PH fulfillment set.
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
  } else {
    logger.warn(
      'No "Philippines delivery" fulfillment set found — run add-philippines-region.ts to create it.'
    )
  }

  logger.info("✅ Stock-location cleanup complete. One hub remains.")
}
