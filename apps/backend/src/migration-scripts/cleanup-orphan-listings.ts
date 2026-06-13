import { ExecArgs } from "@medusajs/framework/types"
import { ContainerRegistrationKeys, Modules } from "@medusajs/framework/utils"
import { LISTING_MODULE } from "../modules/listing"
import type ListingModuleService from "../modules/listing/service"

/**
 * Cleanup: remove the stale product_listing rows left over from dev/testing.
 *
 * By this point every test product has already been soft-deleted (the catalog
 * has 0 live products), but a few product_listing rows were still marked
 * "active", pointing at those deleted products — orphans that would confuse the
 * admin Listings board. This soft-deletes any listing row whose product no
 * longer exists (and any that remain after the purge), leaving an empty,
 * launch-ready catalog. Idempotent: safe to re-run.
 *
 *   npx medusa exec ./src/migration-scripts/cleanup-orphan-listings.ts
 */
export default async function cleanupOrphanListings({ container }: ExecArgs) {
  const logger = container.resolve(ContainerRegistrationKeys.LOGGER)
  const query = container.resolve(ContainerRegistrationKeys.QUERY)
  const productModule = container.resolve(Modules.PRODUCT)
  const listingService: ListingModuleService = container.resolve(LISTING_MODULE)

  const listings = await listingService.listProductListings({}, { take: 1000 })
  if (!listings.length) {
    logger.info("No product_listing rows — catalog already clean.")
    return
  }

  // Map each listing → its linked product id (if any).
  const { data: links } = await query.graph({
    entity: "product_listing",
    fields: ["id", "product.id", "product.deleted_at"],
  })
  const productByListing = new Map<string, { id: string; deleted: boolean } | null>()
  for (const l of links) {
    const prod = (l as { product?: { id?: string; deleted_at?: unknown } }).product
    productByListing.set(
      l.id as string,
      prod?.id ? { id: prod.id, deleted: Boolean(prod.deleted_at) } : null
    )
  }

  // Determine which listings are orphaned (no live product backing them).
  const orphanIds: string[] = []
  for (const listing of listings) {
    const link = productByListing.get(listing.id)
    let live = false
    if (link?.id && !link.deleted) {
      // Double-check the product is really live (the link graph can lag).
      const [p] = await productModule
        .listProducts({ id: [link.id] }, { take: 1 })
        .catch(() => [])
      live = Boolean(p)
    }
    if (!live) orphanIds.push(listing.id)
  }

  if (!orphanIds.length) {
    logger.info(
      `All ${listings.length} listing(s) back a live product — nothing to clean.`
    )
    return
  }

  await listingService.deleteProductListings(orphanIds)
  logger.info(
    `Soft-deleted ${orphanIds.length} orphaned listing row(s): ${orphanIds.join(", ")}`
  )

  const remaining = await listingService.listProductListings({}, { take: 1 })
  const liveProducts = await productModule.listProducts({}, { take: 1 })
  logger.info(
    `Done. Listings remaining: ${remaining.length}. Live products: ${liveProducts.length}.`
  )
}
