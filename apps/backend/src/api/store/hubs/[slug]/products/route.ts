import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"
import { HUB_MODULE } from "../../../../../modules/hub"
import type HubModuleService from "../../../../../modules/hub/service"

/**
 * GET /store/hubs/:slug/products — return the list of product IDs linked to a hub.
 *
 * The storefront filters its product grid using these IDs (rather than adding
 * a hub-aware wrapper around `/store/products`) so we don't have to touch the
 * core product list route. Returns just IDs — the storefront fetches full
 * product detail through the standard `/store/products` route.
 *
 * Query params:
 *   listing_type — optional; filter products by their listing type
 *     ("direct_to_consumer" | "sell_to_freshhub")
 */
export async function GET(req: MedusaRequest, res: MedusaResponse) {
  const hubService: HubModuleService = req.scope.resolve(HUB_MODULE)
  const [hub] = await hubService.listHubs(
    { slug: req.params.slug, active: true },
    { take: 1 }
  )
  if (!hub) {
    res.status(404).json({ error: "Hub not found" })
    return
  }

  const listingType = req.query.listing_type as string | undefined

  const query = req.scope.resolve(ContainerRegistrationKeys.QUERY)

  // If listing_type is specified, fetch products through the listing link
  if (listingType && ["direct_to_consumer", "sell_to_freshhub"].includes(listingType)) {
    const { data } = await query.graph({
      entity: "hub",
      fields: [
        "id",
        "product.id",
        "product.product_listing.listing_type",
      ],
      filters: { id: hub.id },
    })

    const rawProducts = (data[0] as unknown as {
      product?: unknown
    } | undefined)?.product
    const productArr = Array.isArray(rawProducts) ? rawProducts : rawProducts ? [rawProducts] : []

    const products = (productArr as Array<{
      id: string
      product_listing?: { listing_type: string } | Array<{ listing_type: string }>
    }>)
      .filter((p) => {
        const rawListing = p.product_listing
        const listing = Array.isArray(rawListing) ? rawListing[0] : rawListing
        return listing?.listing_type === listingType
      })
      .map((p) => ({ id: p.id }))

    res.json({
      hub_id: hub.id,
      slug: hub.slug,
      listing_type: listingType,
      product_ids: products.map((p) => p.id),
    })
    return
  }

  // Default: return all hub-linked product IDs
  const { data } = await query.graph({
    entity: "hub",
    fields: ["id", "product.id"],
    filters: { id: hub.id },
  })

  const raw = (data[0] as unknown as { product?: { id: string } | { id: string }[] } | undefined)?.product
  const products = Array.isArray(raw) ? raw : raw ? [raw] : []
  res.json({
    hub_id: hub.id,
    slug: hub.slug,
    product_ids: products.map((p) => p.id),
  })
}