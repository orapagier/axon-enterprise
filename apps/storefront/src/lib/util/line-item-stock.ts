import { HttpTypes } from "@medusajs/types"

/**
 * Whether a cart line item can still be ordered for its current quantity.
 * Mirrors the in-stock rule used in product-quick-add: unmanaged inventory and
 * backorder-enabled variants are always orderable; managed variants need enough
 * on-hand stock to cover the line's quantity. Out-of-stock items must not be
 * selectable for checkout.
 */
export function isLineItemInStock(item: HttpTypes.StoreCartLineItem): boolean {
  const variant = item.variant as
    | {
        manage_inventory?: boolean
        allow_backorder?: boolean
        inventory_quantity?: number
      }
    | undefined

  if (!variant) return true
  if (!variant.manage_inventory) return true
  if (variant.allow_backorder) return true
  // Only enforce a stock cap when we actually have a number — if the cart query
  // didn't populate inventory_quantity we don't block (avoids false "out of
  // stock"). retrieveCart requests this field so managed variants get a real
  // value.
  if (typeof variant.inventory_quantity !== "number") return true
  return variant.inventory_quantity >= (item.quantity ?? 1)
}
