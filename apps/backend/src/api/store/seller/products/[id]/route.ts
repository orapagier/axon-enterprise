import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { ContainerRegistrationKeys, Modules } from "@medusajs/framework/utils"
import {
  deleteProductsWorkflow,
  updateProductsWorkflow,
} from "@medusajs/medusa/core-flows"
import { hasRole } from "../../../../../lib/roles"
import { LISTING_MODULE } from "../../../../../modules/listing"
import ListingModuleService from "../../../../../modules/listing/service"
import {
  validateListingTypeLock,
  validateStatusTransition,
} from "../../../../../modules/listing/validators"
import type { ListingStatus } from "../../../../../modules/listing/types"

type StoreCustomer = {
  id: string
  metadata?: Record<string, unknown> | null
}

type ProductVariantWithPrices = {
  id: string
  prices?: Array<{ id: string; amount: number; currency_code: string }>
}

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
  if (meta.account_type !== "producer" && meta.account_type !== "seller") {
    res.status(403).json({ error: "Producer account required" })
    return null
  }
  return customer
}

async function loadOwnedProduct(
  req: MedusaRequest,
  res: MedusaResponse,
  customerId: string
) {
  const productId = req.params.id
  const query = req.scope.resolve(ContainerRegistrationKeys.QUERY)
  const { data } = await query.graph({
    entity: "product",
    fields: [
      "id",
      "title",
      "description",
      "status",
      "thumbnail",
      "origin_country",
      "metadata",
      "variants.id",
      "variants.prices.id",
      "variants.prices.amount",
      "variants.prices.currency_code",
      "product_listing.id",
      "product_listing.harvest_date",
      "product_listing.status",
      "product_listing.pickup_window_id",
      "product_listing.created_at",
      "product_listing.updated_at",
    ],
    filters: { id: productId },
  })
  const product = data?.[0]
  if (!product) {
    res.status(404).json({ error: "Listing not found" })
    return null
  }
  if (
    (product.metadata as Record<string, unknown> | null)?.seller_customer_id !==
    customerId
  ) {
    res.status(403).json({ error: "Not your listing" })
    return null
  }
  return product
}

/** GET /store/seller/products/:id */
export async function GET(req: MedusaRequest, res: MedusaResponse) {
  const customer = await assertSeller(req, res)
  if (!customer) return
  const product = await loadOwnedProduct(req, res, customer.id)
  if (!product) return

  const listingArr = (product as unknown as { product_listing?: unknown[] }).product_listing
  const listing = listingArr?.[0] as Record<string, unknown> | undefined
  const shaped = {
    ...product,
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

  res.json({ product: shaped })
}

/** PATCH /store/seller/products/:id — update title/description/thumbnail/etc. */
export async function PATCH(req: MedusaRequest, res: MedusaResponse) {
  const customer = await assertSeller(req, res)
  if (!customer) return
  const product = await loadOwnedProduct(req, res, customer.id)
  if (!product) return

  const existingListing = (
    (product as unknown as { product_listing?: unknown[] }).product_listing?.[0] as
      | Record<string, unknown>
      | undefined
  )

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
    status?: string
  }

  const currentStatus = (existingListing?.status ?? "draft") as ListingStatus

  // ----- Harvest date changes: lock once a slot has been reserved -----
  if (body.harvest_date !== undefined) {
    const dateLockCheck = validateListingTypeLock(currentStatus, "harvest_date")
    if (!dateLockCheck.ok) {
      res.status(409).json({
        error: dateLockCheck.errors[0].message,
        code: dateLockCheck.errors[0].code,
      })
      return
    }
  }

  // ----- Status transition -----
  if (body.status) {
    const newStatus = body.status as ListingStatus
    if (!["draft", "pending_pickup", "active", "sold_out", "expired", "cancelled"].includes(newStatus)) {
      res.status(400).json({ error: `Invalid status: ${body.status}` })
      return
    }
    const transitionCheck = validateStatusTransition(currentStatus, newStatus)
    if (!transitionCheck.ok) {
      res.status(400).json({
        error: transitionCheck.errors[0].message,
        code: transitionCheck.errors[0].code,
      })
      return
    }
  }

  // ----- Update product -----
  const mergedMeta = {
    ...((product.metadata as Record<string, unknown> | null) ?? {}),
    ...(body.unit !== undefined ? { unit: body.unit } : {}),
    ...(body.category !== undefined ? { category: body.category } : {}),
    ...(body.harvest_date !== undefined
      ? { harvest_date: body.harvest_date?.trim() || null }
      : {}),
    ...(body.price !== undefined
      ? { pending_price_change: Math.round(Number(body.price)) }
      : {}),
    updated_at_by_seller: new Date().toISOString(),
  }

  await updateProductsWorkflow(req.scope).run({
    input: {
      selector: { id: product.id },
      update: {
        ...(body.title !== undefined ? { title: body.title.trim() } : {}),
        ...(body.description !== undefined
          ? { description: body.description.trim() }
          : {}),
        ...(body.thumbnail !== undefined
          ? { thumbnail: body.thumbnail.trim() }
          : {}),
        ...(body.origin_country !== undefined
          ? { origin_country: body.origin_country.trim() }
          : {}),
        metadata: mergedMeta,
      },
    },
  })

  // Update the variant price via the pricing module if supplied.
  const variant = product.variants?.[0] as ProductVariantWithPrices | undefined
  const existingPrice = variant?.prices?.[0]
  if (body.price !== undefined && existingPrice?.id) {
    const pricingModule = req.scope.resolve(Modules.PRICING) as unknown as {
      updatePrices: (input: Array<{
        id: string
        amount: number
        currency_code: string
      }>) => Promise<unknown>
    }
    const currency = (
      body.currency_code ?? existingPrice.currency_code ?? "php"
    ).toLowerCase()
    try {
      await pricingModule.updatePrices([
        {
          id: existingPrice.id,
          amount: Math.round(Number(body.price)),
          currency_code: currency,
        },
      ])
    } catch {
      // Pricing API may differ across Medusa versions — metadata fallback above
      // already records the requested change for admin review.
    }
  }

  // ----- Update listing row -----
  if (existingListing?.id) {
    const listingService: ListingModuleService = req.scope.resolve(LISTING_MODULE)
    const listingUpdates: Record<string, unknown> = {}

    if (body.harvest_date !== undefined) {
      listingUpdates.harvest_date = body.harvest_date?.trim()
        ? new Date(body.harvest_date.trim())
        : null
    }
    if (body.status) {
      listingUpdates.status = body.status
    }

    if (Object.keys(listingUpdates).length > 0) {
      try {
        await listingService.updateProductListings({
          selector: { id: existingListing.id as string },
          data: listingUpdates,
        })
      } catch (err) {
        console.error("Failed to update listing row:", err)
      }
    }
  }

  // Fetch updated listing for response
  const query = req.scope.resolve(ContainerRegistrationKeys.QUERY)
  const { data: updated } = await query.graph({
    entity: "product",
    fields: [
      "id",
      "product_listing.id",
      "product_listing.harvest_date",
      "product_listing.status",
      "product_listing.pickup_window_id",
    ],
    filters: { id: product.id },
  })

  const updatedListing = (
    (updated?.[0] as unknown as { product_listing?: unknown[] } | undefined)?.product_listing?.[0] as
      | Record<string, unknown>
      | undefined
  )

  res.json({
    ok: true,
    listing: updatedListing
      ? {
          id: updatedListing.id,
          harvest_date: updatedListing.harvest_date,
          status: updatedListing.status,
          pickup_window_id: updatedListing.pickup_window_id ?? null,
        }
      : null,
  })
}

/** DELETE /store/seller/products/:id — only allowed while still a draft. */
export async function DELETE(req: MedusaRequest, res: MedusaResponse) {
  const customer = await assertSeller(req, res)
  if (!customer) return
  const product = await loadOwnedProduct(req, res, customer.id)
  if (!product) return

  if (product.status !== "draft") {
    res.status(400).json({
      error:
        "Published listings can't be deleted — set them to 'out of stock' instead.",
    })
    return
  }

  const existingListing = (
    (product as unknown as { product_listing?: unknown[] }).product_listing?.[0] as
      | Record<string, unknown>
      | undefined
  )
  if (existingListing?.id) {
    const listingService: ListingModuleService = req.scope.resolve(LISTING_MODULE)
    try {
      await listingService.deleteProductListings(existingListing.id as string)
    } catch (err) {
      console.error("Failed to delete listing row:", err)
    }
  }

  await deleteProductsWorkflow(req.scope).run({ input: { ids: [product.id] } })
  res.json({ ok: true })
}
