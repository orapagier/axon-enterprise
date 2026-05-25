import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"
import { updateProductsWorkflow } from "@medusajs/medusa/core-flows"
import { LISTING_MODULE } from "../../../../../modules/listing"
import ListingModuleService from "../../../../../modules/listing/service"
import { PICKUP_MODULE } from "../../../../../modules/pickup"
import PickupModuleService from "../../../../../modules/pickup/service"

/**
 * POST /admin/listings/:id/reject
 *
 * Rejects a pending listing:
 *   - sets product.status = "rejected" (hides it from the shop, distinguishes
 *     from author-drafted state)
 *   - sets listing.status = "cancelled"
 *   - for sell_to_freshhub: releases the reserved pickup slot and restores
 *     window.reserved_kg / window.status. Mirrors the compensation logic in
 *     reserve-pickup-slot.ts.
 *
 * Body (optional): { reason: string } — stored on listing-side notes in a
 * future iteration; ignored for now.
 */
export async function POST(req: MedusaRequest, res: MedusaResponse) {
  const listingId = req.params.id
  if (!listingId) {
    res.status(400).json({ error: "Missing listing id." })
    return
  }

  const listingService: ListingModuleService = req.scope.resolve(LISTING_MODULE)
  const pickupService: PickupModuleService = req.scope.resolve(PICKUP_MODULE)
  const query = req.scope.resolve(ContainerRegistrationKeys.QUERY)

  const listings = await listingService.listProductListings(
    { id: listingId },
    { take: 1 }
  )
  const listing = listings[0]
  if (!listing) {
    res.status(404).json({ error: "Listing not found." })
    return
  }

  // Resolve linked product (if any) so we can mark it rejected.
  const { data: linkRows } = await query.graph({
    entity: "product_listing",
    fields: ["id", "product.id", "product.status", "pickup_slot.id", "pickup_slot.estimated_kg"],
    filters: { id: listingId },
  })
  const row = linkRows?.[0] as unknown as
    | {
        product?: { id: string; status: string } | Array<{ id: string; status: string }>
        pickup_slot?: { id: string; estimated_kg: number } | Array<{ id: string; estimated_kg: number }>
      }
    | undefined
  const rawProduct = row?.product
  const linkedProduct = Array.isArray(rawProduct) ? rawProduct[0] : rawProduct
  const rawSlot = row?.pickup_slot
  const linkedSlot = Array.isArray(rawSlot) ? rawSlot[0] : rawSlot

  if (linkedProduct && linkedProduct.status !== "rejected") {
    await updateProductsWorkflow(req.scope).run({
      input: {
        selector: { id: linkedProduct.id },
        update: { status: "rejected" },
      },
    })
  }

  // Release pickup slot + restore window capacity. Every listing reserves a
  // slot at submit time in the hub-only model.
  if (listing.pickup_window_id && linkedSlot) {
    try {
      const windows = await pickupService.listPickupWindows(
        { id: listing.pickup_window_id },
        { take: 1 }
      )
      const window = windows[0]
      const estimatedKg = linkedSlot.estimated_kg ?? 0

      try {
        await pickupService.deletePickupSlots(linkedSlot.id)
      } catch {
        // slot already gone — keep going
      }

      if (window) {
        const restored = Math.max(0, (window.reserved_kg ?? 0) - estimatedKg)
        const restoreUpdate: Record<string, unknown> = {
          reserved_kg: restored,
        }
        // If the window was flipped to "full" by this reservation, ease it
        // back to "open". We don't know the exact prior state without an audit
        // row, so heuristic: full → open when restored < capacity.
        if (
          window.status === "full" &&
          window.capacity_kg !== null &&
          window.capacity_kg !== undefined &&
          restored < window.capacity_kg
        ) {
          restoreUpdate.status = "open"
        }
        await pickupService.updatePickupWindows({
          id: window.id,
          ...restoreUpdate,
        })
      }
    } catch (err) {
      // Best-effort; surface the failure but don't block the rejection.
      console.error("Pickup slot release failed during reject:", err)
    }
  }

  await listingService.updateProductListings({
    id: listing.id,
    status: "cancelled",
  })

  res.json({
    ok: true,
    listing_id: listing.id,
    product_id: linkedProduct?.id ?? null,
    product_status: linkedProduct ? "rejected" : null,
    listing_status: "cancelled",
    slot_released: Boolean(linkedSlot),
  })
}
