import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { LISTING_MODULE } from "../../../modules/listing"
import ListingModuleService from "../../../modules/listing/service"

/**
 * GET /admin/listings — paginated read of all listings.
 * Query params: listing_type, status, producer_id (customer id).
 * Read-only for this phase.
 */
export async function GET(req: MedusaRequest, res: MedusaResponse) {
  const listingService: ListingModuleService = req.scope.resolve(LISTING_MODULE)

  const listingType = req.query.listing_type as string | undefined
  const status = req.query.status as string | undefined
  const producerId = req.query.producer_id as string | undefined

  const filters: Record<string, unknown> = {}
  if (listingType && ["direct_to_consumer", "sell_to_freshhub"].includes(listingType)) {
    filters.listing_type = listingType
  }
  if (status && ["draft", "pending_pickup", "active", "sold_out", "expired", "cancelled"].includes(status)) {
    filters.status = status
  }

  const listings = await listingService.listProductListings(filters, {
    take: 200,
  })

  res.json({ listings, count: listings.length })
}