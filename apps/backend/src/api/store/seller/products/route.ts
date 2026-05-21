import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { ContainerRegistrationKeys, Modules } from "@medusajs/framework/utils"
import {
  createProductsWorkflow,
} from "@medusajs/medusa/core-flows"
import { LISTING_MODULE } from "../../../modules/listing"
import ListingModuleService from "../../../modules/listing/service"
import {
  validateProducerEligibility,
  validateHarvestDate,
  validatePickupWindow,
} from "../../../modules/listing/validators"
import type { ListingType, ListingStatus } from "../../../modules/listing/types"
import { HUB_MODULE } from "../../../modules/hub"
import HubModuleService from "../../../modules/hub/service"

type StoreCustomer = {
  id: string
  metadata?: Record<string, unknown> | null
}

/**
 * Look up the authenticated customer and verify they're a seller.
 * Returns the customer record if OK, otherwise sends an error response and
 * returns null.
 */
async function assertSeller(
  req: MedusaRequest,
  res: MedusaResponse
): Promise<StoreCustomer | null> {
  const customerId = (req as unknown as { auth_context?: { actor_id?: string } })
    .auth_context?.actor_id
  if (!customerId) {
    res.status(401).json({ error: "Not authenticated" })
    return null
  }

  const customerModule = req.scope.resolve(Modules.CUSTOMER)
  const customer = (await customerModule.retrieveCustomer(customerId, {
    select: ["id", "metadata"],
  })) as StoreCustomer | null

  if (!customer) {
    res.status(401).json({ error: "Customer not found" })
    return null
  }

  const meta = (customer.metadata ?? {}) as Record<string, unknown>
  // Accept "producer" (new) and legacy "seller" for backward compat.
  if (meta.account_type !== "producer" && meta.account_type !== "seller") {
    res.status(403).json({ error: "Producer account required" })
    return null
  }
  if (!meta.profile_completed) {
    res.status(403).json({
      error: "Please complete your seller profile before listing products.",
      code: "PROFILE_INCOMPLETE",
    })
    return null
  }
  return customer
}

/** GET /store/seller/products — list this seller's products (all statuses). */
export async function GET(req: MedusaRequest, res: MedusaResponse) {
  const customer = await assertSeller(req, res)
  if (!customer) return

  const query = req.scope.resolve(ContainerRegistrationKeys.QUERY)

  // Fetch products with their listing via the link
  const { data } = await query.graph({
    entity: "product",
    fields: [
      "id",
      "title",
      "handle",
      "status",
      "thumbnail",
      "description",
      "origin_country",
      "metadata",
      "created_at",
      "updated_at",
      "variants.id",
      "variants.title",
      "variants.sku",
      "variants.prices.amount",
      "variants.prices.currency_code",
      "product_listing.id",
      "product_listing.listing_type",
      "product_listing.harvest_date",
      "product_listing.status",
      "product_listing.pickup_window_id",
      "product_listing.created_at",
      "product_listing.updated_at",
    ],
    filters: {
      // Fetch a generous page and filter in memory by seller_customer_id.
    },
    pagination: { take: 500, skip: 0 },
  })

  const ours = (data ?? []).filter(
    (p) =>
      (p as { metadata?: Record<string, unknown> })?.metadata
        ?.seller_customer_id === customer.id
  )

  // Shape listing into a friendly payload per product
  const shaped = ours.map((p) => {
    const listing = (p as { product_listing?: unknown[] }).product_listing?.[0] as
      | Record<string, unknown>
      | undefined
    return {
      ...p,
      product_listing: undefined, // strip raw link array
      listing: listing
        ? {
            id: listing.id,
            listing_type: listing.listing_type,
            harvest_date: listing.harvest_date,
            status: listing.status,
            pickup_window_id: listing.pickup_window_id ?? null,
            created_at: listing.created_at,
            updated_at: listing.updated_at,
          }
        : null,
    }
  })

  res.json({ products: shaped, count: shaped.length })
}

/** POST /store/seller/products — create a new draft listing. */
export async function POST(req: MedusaRequest, res: MedusaResponse) {
  const customer = await assertSeller(req, res)
  if (!customer) return

  const meta = (customer.metadata ?? {}) as Record<string, unknown>

  const body = (req.body ?? {}) as {
    title?: string
    description?: string
    thumbnail?: string
    origin_country?: string
    category?: string
    unit?: string
    price?: number
    currency_code?: string
    inventory_quantity?: number
    selling_mode?: string
    harvest_date?: string
    listing_type?: string
  }

  // ----- Listing-type from body (preferred) or fallback to legacy selling_mode -----
  const rawListingType = (body.listing_type ?? body.selling_mode ?? "").trim()
  let listingType: ListingType | null = null

  if (rawListingType === "direct_to_consumer" || rawListingType === "direct") {
    listingType = "direct_to_consumer"
  } else if (rawListingType === "sell_to_freshhub" || rawListingType === "hub") {
    listingType = "sell_to_freshhub"
  }

  if (!listingType) {
    res.status(400).json({
      error: "listing_type is required. Must be 'direct_to_consumer' or 'sell_to_freshhub'.",
    })
    return
  }

  // ----- Producer eligibility check -----
  const eligibility = validateProducerEligibility(meta)
  if (!eligibility.ok) {
    res.status(422).json({
      error: eligibility.errors[0].message,
      code: eligibility.errors[0].code,
      fieldErrors: eligibility.errors,
    })
    return
  }

  // ----- Harvest date for sell_to_freshhub -----
  let harvestDate: string | null = null
  if (listingType === "sell_to_freshhub") {
    // Find the producer's hub to get its timezone
    const hubService: HubModuleService = req.scope.resolve(HUB_MODULE)
    const query = req.scope.resolve(ContainerRegistrationKeys.QUERY)
    const { data: hubData } = await query.graph({
      entity: "customer",
      fields: ["id", "hub.id", "hub.timezone"],
      filters: { id: customer.id },
    })
    const hub = (hubData?.[0] as { hub?: { id?: string; timezone?: string } } | undefined)?.hub
    const hubTimezone = hub?.timezone ?? "Asia/Manila"

    const harvestRaw = body.harvest_date?.trim() ?? null
    const dateCheck = validateHarvestDate(harvestRaw, hubTimezone, 3, 5)
    if (!dateCheck.ok) {
      res.status(400).json({
        error: dateCheck.errors[0].message,
        code: dateCheck.errors[0].code,
        fieldErrors: dateCheck.errors,
      })
      return
    }
    harvestDate = harvestRaw
  }

  // ----- Pickup window match (deferred, always OK in Phase 2) -----
  let listingStatus: ListingStatus = "draft"
  if (listingType === "sell_to_freshhub") {
    const pw = validatePickupWindow(null, null)
    listingStatus = pw.status // "pending_pickup"
  }

  // ----- Basic field validation -----
  if (!body.title || body.title.trim().length < 2) {
    res.status(400).json({ error: "Title is required (min 2 chars)." })
    return
  }
  if (!body.price || Number.isNaN(Number(body.price)) || Number(body.price) <= 0) {
    res.status(400).json({ error: "A positive price is required." })
    return
  }
  const currency = (body.currency_code ?? "php").toLowerCase()

  // Resolve a sales channel + shipping profile so the product is usable.
  const query = req.scope.resolve(ContainerRegistrationKeys.QUERY)
  const { data: salesChannels } = await query.graph({
    entity: "sales_channel",
    fields: ["id"],
    pagination: { take: 1 },
  })
  const { data: shippingProfiles } = await query.graph({
    entity: "shipping_profile",
    fields: ["id"],
    pagination: { take: 1 },
  })
  const salesChannelId = salesChannels?.[0]?.id
  const shippingProfileId = shippingProfiles?.[0]?.id

  const { result } = await createProductsWorkflow(req.scope).run({
    input: {
      products: [
        {
          title: body.title.trim(),
          description: body.description?.trim() ?? undefined,
          thumbnail: body.thumbnail?.trim() || undefined,
          origin_country: body.origin_country?.trim() || undefined,
          // Drafts are not visible to buyers until an admin publishes them.
          status: "draft",
          shipping_profile_id: shippingProfileId,
          sales_channels: salesChannelId ? [{ id: salesChannelId }] : [],
          options: [{ title: "Size", values: ["Default"] }],
          variants: [
            {
              title: "Default",
              sku: undefined,
              manage_inventory: false,
              options: { Size: "Default" },
              prices: [
                {
                  amount: Math.round(Number(body.price)),
                  currency_code: currency,
                },
              ],
            },
          ],
          metadata: {
            seller_customer_id: customer.id,
            selling_mode: listingType,
            harvest_date: harvestDate,
            unit: body.unit ?? "kg",
            category: body.category ?? null,
            submitted_at: new Date().toISOString(),
          },
        },
      ],
    },
  })

  const product = result?.[0]

  // ----- Create the ProductListing row via link -----
  if (product) {
    const listingService: ListingModuleService = req.scope.resolve(LISTING_MODULE)
    try {
      const listing = await listingService.createProductListings({
        listing_type: listingType,
        harvest_date: harvestDate ? new Date(harvestDate) : null,
        pickup_window_id: null,
        status: listingStatus,
      })

      // Link product to listing
      const { data: linkData } = await query.graph({
        entity: "product",
        fields: ["id", "product_listing.id"],
        filters: { id: product.id },
      })

      res.status(201).json({ product, listing })
      return
    } catch (err) {
      // Listing creation failed — product was still created.
      // Log and return partial success. The product exists but has no listing row.
      console.error("Failed to create listing row:", err)
    }
  }

  res.status(201).json({ product: result?.[0] })
}