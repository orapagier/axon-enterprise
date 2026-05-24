import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { ContainerRegistrationKeys, Modules } from "@medusajs/framework/utils"
import { LISTING_MODULE } from "../../../modules/listing"
import ListingModuleService from "../../../modules/listing/service"
import { PICKUP_MODULE } from "../../../modules/pickup"
import PickupModuleService from "../../../modules/pickup/service"

/**
 * GET /admin/listings — paginated read of all listings, joined with their
 * linked product + producer customer + pickup window.
 *
 * Query params:
 *   status:       listing status (draft|pending_pickup|active|sold_out|expired|cancelled)
 *   review:       "pending" — convenience filter for the admin review queue
 *                 (any listing whose product is still draft). Overrides status if set.
 *   producer_id:  customer id of the producer
 */
export async function GET(req: MedusaRequest, res: MedusaResponse) {
  const listingService: ListingModuleService = req.scope.resolve(LISTING_MODULE)
  const pickupService: PickupModuleService = req.scope.resolve(PICKUP_MODULE)
  const query = req.scope.resolve(ContainerRegistrationKeys.QUERY)
  const customerModule = req.scope.resolve(Modules.CUSTOMER)

  const review = req.query.review as string | undefined
  const isReviewQueue = review === "pending"

  const status = req.query.status as string | undefined

  const filters: Record<string, unknown> = {}
  if (
    !isReviewQueue &&
    status &&
    [
      "draft",
      "pending_pickup",
      "active",
      "sold_out",
      "expired",
      "cancelled",
    ].includes(status)
  ) {
    filters.status = status
  }

  const listings = await listingService.listProductListings(filters, {
    take: 200,
    order: { created_at: "DESC" } as Record<string, "ASC" | "DESC">,
  })

  if (!listings.length) {
    res.json({ listings: [], count: 0 })
    return
  }

  const listingIds = listings.map((l) => l.id)
  const { data: linkRows } = await query.graph({
    entity: "product_listing",
    fields: [
      "id",
      "product.id",
      "product.title",
      "product.handle",
      "product.status",
      "product.thumbnail",
      "product.metadata",
      "product.created_at",
    ],
    filters: { id: listingIds },
    pagination: { take: 500 },
  })

  const productByListing = new Map<string, Record<string, unknown>>()
  for (const row of (linkRows ?? []) as unknown as Array<{
    id: string
    product?: Record<string, unknown>[]
  }>) {
    const p = row.product?.[0]
    if (p) productByListing.set(row.id, p)
  }

  const producerIds = new Set<string>()
  for (const p of productByListing.values()) {
    const meta = (p.metadata ?? {}) as Record<string, unknown>
    if (typeof meta.seller_customer_id === "string") {
      producerIds.add(meta.seller_customer_id)
    }
  }

  let producers: Array<{
    id: string
    email: string | null
    first_name: string | null
    last_name: string | null
    company_name: string | null
    metadata: Record<string, unknown> | null
  }> = []
  if (producerIds.size) {
    producers = (await customerModule.listCustomers(
      { id: Array.from(producerIds) },
      {
        select: [
          "id",
          "email",
          "first_name",
          "last_name",
          "company_name",
          "metadata",
        ],
      }
    )) as typeof producers
  }
  const producerById = new Map(producers.map((c) => [c.id, c]))

  const windowIds = listings
    .map((l) => l.pickup_window_id)
    .filter((id): id is string => typeof id === "string" && id.length > 0)
  let windows: Awaited<ReturnType<typeof pickupService.listPickupWindows>> = []
  if (windowIds.length) {
    windows = await pickupService.listPickupWindows(
      { id: windowIds },
      { take: windowIds.length }
    )
  }
  const windowById = new Map(windows.map((w) => [w.id, w]))

  const shaped = listings
    .map((l) => {
      const product = productByListing.get(l.id) ?? null
      const meta = ((product?.metadata ?? {}) as Record<string, unknown>) ?? {}
      const producer = (() => {
        const id =
          typeof meta.seller_customer_id === "string"
            ? meta.seller_customer_id
            : null
        if (!id) return null
        const c = producerById.get(id)
        if (!c) return { id }
        return {
          id: c.id,
          email: c.email,
          first_name: c.first_name,
          last_name: c.last_name,
          company_name: c.company_name,
          business_name:
            (c.metadata as Record<string, unknown> | null)?.business_name ??
            null,
          primary_hub:
            (c.metadata as Record<string, unknown> | null)?.primary_hub ?? null,
        }
      })()
      const window = l.pickup_window_id
        ? windowById.get(l.pickup_window_id)
        : null
      return {
        id: l.id,
        status: l.status,
        harvest_date: l.harvest_date,
        pickup_window_id: l.pickup_window_id,
        created_at: (l as unknown as { created_at?: string }).created_at ?? null,
        product: product
          ? {
              id: product.id,
              title: product.title,
              handle: product.handle,
              status: product.status,
              thumbnail: product.thumbnail,
              unit: meta.unit ?? null,
              category: meta.category ?? null,
              asking_price: meta.asking_price ?? null,
            }
          : null,
        producer,
        pickup_window: window
          ? {
              id: window.id,
              date: window.date,
              start_time: window.start_time,
              end_time: window.end_time,
              status: window.status,
              capacity_kg: window.capacity_kg,
              reserved_kg: window.reserved_kg,
            }
          : null,
      }
    })
    .filter((row) => {
      if (!isReviewQueue) return true
      return row.product?.status === "draft"
    })

  res.json({ listings: shaped, count: shaped.length })
}
