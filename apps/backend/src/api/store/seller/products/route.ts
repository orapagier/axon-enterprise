import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { ContainerRegistrationKeys, Modules } from "@medusajs/framework/utils"
import { createProductsWorkflow } from "@medusajs/medusa/core-flows"
import { LISTING_MODULE } from "../../../../modules/listing"
import ListingModuleService from "../../../../modules/listing/service"
import {
  validateProducerEligibility,
  validateHarvestDate,
} from "../../../../modules/listing/validators"
import { validateSlotReserve } from "../../../../modules/pickup/validators"
import { PICKUP_MODULE } from "../../../../modules/pickup"
import PickupModuleService from "../../../../modules/pickup/service"
import reservePickupSlotWorkflow from "../../../../workflows/reserve-pickup-slot"

type StoreCustomer = {
  id: string
  metadata?: Record<string, unknown> | null
}

/**
 * Look up the authenticated customer and verify they're a producer with a
 * completed profile. All listings flow through the hub (sell_to_freshhub),
 * so producers must be a hub member and have committed to a hub before they
 * can list.
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
      "product_listing.harvest_date",
      "product_listing.status",
      "product_listing.pickup_window_id",
      "product_listing.created_at",
      "product_listing.updated_at",
    ],
    filters: {},
    pagination: { take: 500, skip: 0 },
  })

  const ours = (data ?? []).filter(
    (p) =>
      (p as { metadata?: Record<string, unknown> })?.metadata
        ?.seller_customer_id === customer.id
  )

  const shaped = ours.map((p) => {
    const listing = (p as unknown as { product_listing?: unknown[] }).product_listing?.[0] as
      | Record<string, unknown>
      | undefined
    return {
      ...p,
      product_listing: undefined,
      listing: listing
        ? {
            id: listing.id,
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

/**
 * POST /store/seller/products — create a new listing.
 *
 * Hub-only model: every submission commits volume to a hub pickup window.
 * The product is always created as `draft` and waits for admin approval
 * via /admin/listings before buyers see it on the shop.
 *
 * Required body: title, price (asking price in PHP; hub may adjust at
 * approval), harvest_date, pickup_window_id, estimated_kg.
 */
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
    harvest_date?: string
    pickup_window_id?: string
    estimated_kg?: number
  }

  // ----- Producer eligibility (active hub membership) -----
  const eligibility = validateProducerEligibility(meta)
  if (!eligibility.ok) {
    res.status(422).json({
      error: eligibility.errors[0].message,
      code: eligibility.errors[0].code,
      fieldErrors: eligibility.errors,
    })
    return
  }

  // ----- Harvest date (validated against the producer's hub timezone) -----
  const hubQuery = req.scope.resolve(ContainerRegistrationKeys.QUERY)
  const { data: hubData } = await hubQuery.graph({
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
  const harvestDate = harvestRaw as string

  // ----- Pickup window + estimated_kg -----
  if (!body.pickup_window_id || !body.estimated_kg) {
    res.status(400).json({
      error: "pickup_window_id and estimated_kg are required.",
      code: "MISSING_PICKUP_FIELDS",
    })
    return
  }

  const pickupService: PickupModuleService = req.scope.resolve(PICKUP_MODULE)
  const windows = await pickupService.listPickupWindows(
    { id: body.pickup_window_id },
    { take: 1 }
  )
  const window = windows[0]
  if (!window) {
    res.status(400).json({
      error: "Pickup window not found.",
      code: "PICKUP_WINDOW_NOT_FOUND",
    })
    return
  }

  const reserveValidation = validateSlotReserve({
    windowStatus: window.status as "open" | "full" | "closed" | "completed",
    windowDate:
      typeof window.date === "string"
        ? window.date
        : new Date(window.date).toISOString(),
    harvestDate,
    reserved_kg: window.reserved_kg ?? 0,
    estimated_kg: body.estimated_kg,
    capacity_kg: window.capacity_kg ?? null,
  })

  if (!reserveValidation.ok) {
    res.status(400).json({
      error: reserveValidation.errors[0].message,
      code: reserveValidation.errors[0].code,
      fieldErrors: reserveValidation.errors,
    })
    return
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
          // Mirror the thumbnail into the gallery — the product detail page
          // renders product.images[] and falls through to an empty gallery
          // when only `thumbnail` is set.
          images: body.thumbnail?.trim()
            ? [{ url: body.thumbnail.trim() }]
            : undefined,
          origin_country: body.origin_country?.trim() || undefined,
          // Always draft: hub reviews + sets the retail price before
          // approving via /admin/listings.
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
            harvest_date: harvestDate,
            unit: body.unit ?? "kg",
            category: body.category ?? null,
            asking_price: Math.round(Number(body.price)),
            submitted_at: new Date().toISOString(),
          },
        },
      ],
    },
  })

  const product = result?.[0]
  if (!product) {
    res.status(500).json({ error: "Product creation failed." })
    return
  }

  const listingService: ListingModuleService = req.scope.resolve(LISTING_MODULE)
  const link = req.scope.resolve(ContainerRegistrationKeys.LINK)

  let listing
  try {
    listing = await listingService.createProductListings({
      listing_type: "sell_to_freshhub",
      harvest_date: new Date(harvestDate),
      pickup_window_id: body.pickup_window_id,
      status: "active",
    })

    if (!listing?.id) {
      throw new Error(
        `createProductListings returned no id (got ${JSON.stringify(listing)})`
      )
    }

    // Link product ↔ listing so the GET graph join can hydrate it.
    await link.create({
      [Modules.PRODUCT]: { product_id: product.id },
      [LISTING_MODULE]: { product_listing_id: listing.id },
    })
  } catch (err) {
    console.error("Failed to create listing row or link:", err)
    res.status(500).json({
      error:
        err instanceof Error
          ? `Listing record failed: ${err.message}`
          : "Could not record the listing for this product.",
      product,
    })
    return
  }

  // Reserve the pickup slot through the workflow so the slot + capacity bump
  // + window-full flip roll back together on failure.
  try {
    const { result: slot } = await reservePickupSlotWorkflow(req.scope).run({
      input: {
        listing_id: listing.id,
        pickup_window_id: body.pickup_window_id,
        harvest_date: harvestDate,
        estimated_kg: body.estimated_kg,
      },
    })

    if (slot?.id) {
      await link.create({
        [LISTING_MODULE]: { product_listing_id: listing.id },
        [PICKUP_MODULE]: { pickup_slot_id: slot.id },
      })
    }
  } catch (err) {
    // Workflow already compensated the slot + capacity. Roll back the listing
    // + link so the producer can retry cleanly.
    console.error("Pickup slot reservation failed:", err)
    try {
      await link.dismiss({
        [Modules.PRODUCT]: { product_id: product.id },
        [LISTING_MODULE]: { product_listing_id: listing.id },
      })
      await listingService.deleteProductListings(listing.id)
    } catch {
      // best-effort cleanup
    }
    res.status(400).json({
      error: err instanceof Error ? err.message : "Pickup slot reservation failed.",
      code: "PICKUP_RESERVE_FAILED",
    })
    return
  }

  res.status(201).json({ product, listing })
}
