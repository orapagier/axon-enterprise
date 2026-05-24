import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"
import { updateProductsWorkflow } from "@medusajs/medusa/core-flows"
import { LISTING_MODULE } from "../../../../../modules/listing"
import ListingModuleService from "../../../../../modules/listing/service"

/**
 * POST /admin/listings/:id/approve
 *
 * Publishes the product linked to this listing so buyers can see it. Intended
 * for sell_to_freshhub listings, which stay draft at creation and wait for
 * hub-side approval. Direct-to-consumer listings are auto-published at submit
 * time and don't pass through here — but the endpoint is idempotent on
 * already-published products, so calling it twice is harmless.
 *
 * The pickup slot was reserved at submit time, so approval doesn't touch
 * pickup state — it only flips product.status to "published".
 */
export async function POST(req: MedusaRequest, res: MedusaResponse) {
  const listingId = req.params.id
  if (!listingId) {
    res.status(400).json({ error: "Missing listing id." })
    return
  }

  const listingService: ListingModuleService = req.scope.resolve(LISTING_MODULE)
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

  const { data: linkRows } = await query.graph({
    entity: "product_listing",
    fields: ["id", "product.id", "product.status"],
    filters: { id: listingId },
  })
  const linked = (linkRows?.[0] as { product?: Array<{ id: string; status: string }> })
    ?.product?.[0]
  if (!linked) {
    res.status(409).json({
      error: "Listing has no linked product to publish.",
    })
    return
  }

  if (linked.status !== "published") {
    await updateProductsWorkflow(req.scope).run({
      input: {
        selector: { id: linked.id },
        update: { status: "published" },
      },
    })
  }

  // listing.status is already "active" for STH (set at submit time after slot
  // reservation). Bump anything still on "draft" to "active" for consistency.
  if (listing.status === "draft") {
    await listingService.updateProductListings({
      id: listing.id,
      status: "active",
    })
  }

  res.json({
    ok: true,
    listing_id: listing.id,
    product_id: linked.id,
    product_status: "published",
  })
}
