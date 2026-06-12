import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { ContainerRegistrationKeys, Modules } from "@medusajs/framework/utils"
import {
  createProductsWorkflow,
  deleteProductsWorkflow,
} from "@medusajs/medusa/core-flows"
import { LISTING_MODULE } from "../../../../modules/listing"
import ListingModuleService from "../../../../modules/listing/service"
import {
  validateProducerEligibility,
  validateHarvestDate,
} from "../../../../modules/listing/validators"
import { validateSlotReserve } from "../../../../modules/pickup/validators"
import { PICKUP_MODULE } from "../../../../modules/pickup"
import PickupModuleService from "../../../../modules/pickup/service"
import { HUB_MODULE } from "../../../../modules/hub"
import reservePickupSlotWorkflow from "../../../../workflows/reserve-pickup-slot"
import { hasRole } from "../../../../lib/roles"
import { LISTING_TYPES, type ListingType } from "../../../../modules/listing/types"

type StoreCustomer = {
  id: string
  first_name?: string | null
  last_name?: string | null
  company_name?: string | null
  metadata?: Record<string, unknown> | null
}

/**
 * Look up the authenticated customer and verify they're a producer with a
 * completed profile. Producers must be a hub member and have committed to a
 * hub before they can list, regardless of listing type.
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
    select: ["id", "first_name", "last_name", "company_name", "metadata"],
  })) as StoreCustomer | null

  if (!customer) {
    res.status(401).json({ error: "Customer not found" })
    return null
  }

  const meta = (customer.metadata ?? {}) as Record<string, unknown>
  if (!hasRole(meta, "producer")) {
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

  const PRODUCT_FIELDS = [
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
  ]

  // Products carry their seller in `metadata.seller_customer_id` rather than a
  // queryable link, so we can't filter at the DB layer (the previous code
  // capped at 500 products and filtered in JS, silently hiding a seller's own
  // listings once the catalog grew past that). Page through the catalog so the
  // result is always complete.
  //
  // TODO(perf): introduce a seller(customer) ↔ product module link created at
  // listing time and query by it for an O(seller) lookup instead of scanning.
  const PAGE_SIZE = 200
  const MAX_PAGES = 50 // safety bound (<= 10k products scanned)
  const ours: Record<string, unknown>[] = []

  for (let page = 0; page < MAX_PAGES; page++) {
    const { data } = await query.graph({
      entity: "product",
      fields: PRODUCT_FIELDS,
      pagination: { take: PAGE_SIZE, skip: page * PAGE_SIZE },
    })
    const batch = data ?? []
    for (const p of batch) {
      const sellerId = (p as { metadata?: Record<string, unknown> })?.metadata
        ?.seller_customer_id
      if (sellerId === customer.id) {
        ours.push(p as Record<string, unknown>)
      }
    }
    if (batch.length < PAGE_SIZE) break // last page reached
  }

  const shaped = ours.map((p) => {
    const raw = (p as unknown as { product_listing?: unknown }).product_listing
    const listing = (Array.isArray(raw) ? raw[0] : raw) as
      | Record<string, unknown>
      | undefined
    return {
      ...p,
      product_listing: undefined,
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

/**
 * POST /store/seller/products — create a new listing.
 *
 * Two listing types:
 *   - sell_to_freshhub: the producer commits volume to a hub pickup window.
 *     The product is created as `draft`; the hub receives the goods, sets the
 *     retail price, and an admin approves via /admin/listings. The hub is the
 *     seller of record.
 *   - direct_to_consumer: Shopee-style. The producer is the seller; the
 *     product is published immediately and buyers see a producer-
 *     responsibility disclaimer (freshness/quality is on the producer, not
 *     the hub). No pickup window is reserved.
 *
 * Required body: title, price (PHP), listing_type; for sell_to_freshhub also
 * harvest_date, pickup_window_id, estimated_kg.
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
    listing_type?: string
    harvest_date?: string
    pickup_window_id?: string
    estimated_kg?: number
  }

  const listingTypeRaw = body.listing_type ?? "sell_to_freshhub"
  if (!LISTING_TYPES.includes(listingTypeRaw as ListingType)) {
    res.status(400).json({
      error: `Invalid listing_type: ${listingTypeRaw}`,
      code: "INVALID_LISTING_TYPE",
    })
    return
  }
  const listingType = listingTypeRaw as ListingType
  const isDirect = listingType === "direct_to_consumer"

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

  const hubQuery = req.scope.resolve(ContainerRegistrationKeys.QUERY)
  const { data: hubData } = await hubQuery.graph({
    entity: "customer",
    fields: ["id", "hub.id", "hub.name", "hub.timezone"],
    filters: { id: customer.id },
  })
  const hub = (
    hubData?.[0] as
      | { hub?: { id?: string; name?: string; timezone?: string } }
      | undefined
  )?.hub
  const hubTimezone = hub?.timezone ?? "Asia/Manila"

  // ----- Hub intake fields (sell_to_freshhub only) -----
  let harvestDate: string | null = null
  if (!isDirect) {
    // Harvest date is validated against the producer's hub timezone.
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
    harvestDate = harvestRaw as string

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

  // Title is shared across sellers, so the auto-derived handle ("potatoes",
  // "mangoes", …) collides as soon as a second producer lists the same crop.
  // Append a short random suffix so every listing gets a unique URL slug.
  // Hubs can still rename the handle at approval time in the admin.
  const titleTrimmed = body.title.trim()
  const baseSlug = titleTrimmed
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48) || "listing"
  const suffix = Math.random().toString(36).slice(2, 8)
  const uniqueHandle = `${baseSlug}-${suffix}`

  // Seller of record shown to buyers: the producer for direct listings, the
  // hub for sell_to_freshhub (stamped on metadata so the storefront can
  // attribute without joining custom modules through /store/products).
  const producerName =
    (typeof meta.business_name === "string" && meta.business_name.trim()) ||
    (customer.company_name ?? "").trim() ||
    [customer.first_name, customer.last_name].filter(Boolean).join(" ").trim() ||
    null

  let result: { id?: string }[] | undefined
  try {
    const workflowRes = await createProductsWorkflow(req.scope).run({
      input: {
        products: [
          {
            title: titleTrimmed,
            handle: uniqueHandle,
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
    result = workflowRes.result as { id?: string }[] | undefined
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    console.error("createProductsWorkflow failed:", err)
    // Duplicate handle should be impossible with the random suffix, but
    // surface it cleanly if some other unique constraint trips.
    const isDuplicate = /already exists|duplicate/i.test(message)
    res.status(isDuplicate ? 409 : 500).json({
      error: isDuplicate
        ? "A product with these details already exists. Please change the title and try again."
        : `Could not create the product: ${message}`,
      code: isDuplicate ? "PRODUCT_DUPLICATE" : "PRODUCT_CREATE_FAILED",
    })
    return
  }

  const product = result?.[0]
  if (!product?.id) {
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

    // Link product ↔ hub so it appears in the hub's storefront catalog.
    if (hub?.id) {
      await link.create({
        [Modules.PRODUCT]: { product_id: product.id },
        [HUB_MODULE]: { hub_id: hub.id },
      })
    }
  } catch (err) {
    console.error("Failed to create listing row or link:", err)
    // Roll back the orphaned product so a failed listing doesn't leave a
    // dangling draft behind.
    await deleteProductsWorkflow(req.scope)
      .run({ input: { ids: [product.id] } })
      .catch((e) => console.error("Orphan product cleanup failed:", e))
    res.status(500).json({
      error:
        err instanceof Error
          ? `Listing record failed: ${err.message}`
          : "Could not record the listing for this product.",
    })
    return
  }

  // Reserve the pickup slot + link it to the listing. The workflow runs the
  // reservation under a per-window lock (so concurrent submissions can't
  // overcommit capacity) and self-compensates its slot/capacity/link work if
  // anything inside it fails.
  try {
    await reservePickupSlotWorkflow(req.scope).run({
      input: {
        listing_id: listing.id,
        pickup_window_id: body.pickup_window_id,
        harvest_date: harvestDate,
        estimated_kg: body.estimated_kg,
      },
    })
  } catch (err) {
    console.error("Pickup slot reservation failed:", err)
    // The workflow already rolled back its own work. Unwind everything created
    // before it — the listing, its links, and the product itself — so a failed
    // reservation never leaves an orphaned draft product or dangling listing.
    try {
      await link.dismiss({
        [Modules.PRODUCT]: { product_id: product.id },
        [LISTING_MODULE]: { product_listing_id: listing.id },
      })
    } catch {
      // best-effort
    }
    if (hub?.id) {
      try {
        await link.dismiss({
          [Modules.PRODUCT]: { product_id: product.id },
          [HUB_MODULE]: { hub_id: hub.id },
        })
      } catch {
        // best-effort
      }
    }
    await listingService.deleteProductListings(listing.id).catch(() => {})
    await deleteProductsWorkflow(req.scope)
      .run({ input: { ids: [product.id] } })
      .catch((e) => console.error("Orphan product cleanup failed:", e))
    res.status(400).json({
      error:
        err instanceof Error ? err.message : "Pickup slot reservation failed.",
      code: "PICKUP_RESERVE_FAILED",
    })
    return
  }

  res.status(201).json({ product, listing })
}
