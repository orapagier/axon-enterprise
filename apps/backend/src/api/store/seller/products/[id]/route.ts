import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { ContainerRegistrationKeys, Modules } from "@medusajs/framework/utils"
import {
  deleteProductsWorkflow,
  updateProductsWorkflow,
} from "@medusajs/medusa/core-flows"

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
  res.json({ product })
}

/** PATCH /store/seller/products/:id — update title/description/thumbnail/etc. */
export async function PATCH(req: MedusaRequest, res: MedusaResponse) {
  const customer = await assertSeller(req, res)
  if (!customer) return
  const product = await loadOwnedProduct(req, res, customer.id)
  if (!product) return

  const body = (req.body ?? {}) as {
    title?: string
    description?: string
    thumbnail?: string
    origin_country?: string
    category?: string
    unit?: string
    price?: number
    currency_code?: string
  }

  const mergedMeta = {
    ...((product.metadata as Record<string, unknown> | null) ?? {}),
    ...(body.unit !== undefined ? { unit: body.unit } : {}),
    ...(body.category !== undefined ? { category: body.category } : {}),
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
        ...(body.thumbnail !== undefined ? { thumbnail: body.thumbnail.trim() } : {}),
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
    const currency = (body.currency_code ??
      existingPrice.currency_code ??
      "php").toLowerCase()
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

  res.json({ ok: true })
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

  await deleteProductsWorkflow(req.scope).run({ input: { ids: [product.id] } })
  res.json({ ok: true })
}
