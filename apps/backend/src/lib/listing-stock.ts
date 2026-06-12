/**
 * Inventory plumbing for producer listings.
 *
 * Direct-to-consumer listings track real stock: the variant manages inventory
 * and carries an inventory level at the hub's stock location. Medusa then
 * reserves/deducts automatically as buyers order, so the storefront's
 * "X left" / "Out of stock" states stay truthful without any custom code.
 */
import { MedusaContainer } from "@medusajs/framework/types"
import { ContainerRegistrationKeys, Modules } from "@medusajs/framework/utils"
import {
  createInventoryItemsWorkflow,
  createInventoryLevelsWorkflow,
  updateInventoryLevelsWorkflow,
  updateProductVariantsWorkflow,
} from "@medusajs/medusa/core-flows"

type VariantInventoryRow = {
  id: string
  manage_inventory?: boolean | null
  inventory_items?: Array<{ inventory?: { id?: string } | null } | null> | null
}

async function getVariantInventory(
  scope: MedusaContainer,
  variantId: string
): Promise<{ manageInventory: boolean; inventoryItemId: string | null }> {
  const query = scope.resolve(ContainerRegistrationKeys.QUERY)
  const { data } = await query.graph({
    entity: "variant",
    fields: ["id", "manage_inventory", "inventory_items.inventory.id"],
    filters: { id: variantId },
  })
  const variant = data?.[0] as VariantInventoryRow | undefined
  const inventoryItemId =
    variant?.inventory_items
      ?.map((row) => row?.inventory?.id)
      .find((id): id is string => !!id) ?? null
  return {
    manageInventory: !!variant?.manage_inventory,
    inventoryItemId,
  }
}

/** The single canonical hub stock location (see cleanup-stock-locations.ts). */
async function getStockLocationId(scope: MedusaContainer): Promise<string> {
  const query = scope.resolve(ContainerRegistrationKeys.QUERY)
  const { data } = await query.graph({
    entity: "stock_location",
    fields: ["id"],
    pagination: { take: 1 },
  })
  const id = (data?.[0] as { id?: string } | undefined)?.id
  if (!id) {
    throw new Error(
      "No stock location found — run add-philippines-region.ts to create the hub location."
    )
  }
  return id
}

/**
 * Point-in-time set of a variant's on-hand stock. Ensures the variant manages
 * inventory, has an inventory item, and upserts the level at the hub location.
 * Buyers see available = stocked - reserved, so open orders stay accounted for.
 */
export async function setVariantStock(
  scope: MedusaContainer,
  variantId: string,
  quantity: number
): Promise<void> {
  let { manageInventory, inventoryItemId } = await getVariantInventory(
    scope,
    variantId
  )

  if (!manageInventory) {
    await updateProductVariantsWorkflow(scope).run({
      input: {
        selector: { id: variantId },
        update: { manage_inventory: true },
      },
    })
    // Flipping the flag may auto-provision the inventory item — re-check.
    ;({ inventoryItemId } = await getVariantInventory(scope, variantId))
  }

  if (!inventoryItemId) {
    const { result } = await createInventoryItemsWorkflow(scope).run({
      input: { items: [{}] },
    })
    inventoryItemId = (result?.[0] as { id?: string } | undefined)?.id ?? null
    if (!inventoryItemId) {
      throw new Error("Could not create an inventory item for the listing.")
    }
    const link = scope.resolve(ContainerRegistrationKeys.LINK)
    await link.create({
      [Modules.PRODUCT]: { variant_id: variantId },
      [Modules.INVENTORY]: { inventory_item_id: inventoryItemId },
    })
  }

  const locationId = await getStockLocationId(scope)
  const inventoryModule = scope.resolve(Modules.INVENTORY)
  const existingLevels = await inventoryModule.listInventoryLevels(
    { inventory_item_id: inventoryItemId, location_id: locationId },
    { take: 1 }
  )

  if (existingLevels[0]) {
    await updateInventoryLevelsWorkflow(scope).run({
      input: {
        updates: [
          {
            inventory_item_id: inventoryItemId,
            location_id: locationId,
            stocked_quantity: quantity,
          },
        ],
      },
    })
  } else {
    await createInventoryLevelsWorkflow(scope).run({
      input: {
        inventory_levels: [
          {
            inventory_item_id: inventoryItemId,
            location_id: locationId,
            stocked_quantity: quantity,
          },
        ],
      },
    })
  }
}

/**
 * Producer-facing on-hand stock for a variant (sum of stocked quantities).
 * Returns null when the variant doesn't track inventory.
 */
export async function getVariantStock(
  scope: MedusaContainer,
  variantId: string
): Promise<number | null> {
  const { manageInventory, inventoryItemId } = await getVariantInventory(
    scope,
    variantId
  )
  if (!manageInventory || !inventoryItemId) return null

  const inventoryModule = scope.resolve(Modules.INVENTORY)
  const levels = await inventoryModule.listInventoryLevels(
    { inventory_item_id: inventoryItemId },
    { take: 100 }
  )
  return levels.reduce(
    (sum, level) => sum + Number(level.stocked_quantity ?? 0),
    0
  )
}
