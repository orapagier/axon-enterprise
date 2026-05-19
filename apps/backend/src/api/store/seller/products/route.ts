import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { ContainerRegistrationKeys, Modules } from "@medusajs/framework/utils"
import {
  createProductsWorkflow,
} from "@medusajs/medusa/core-flows"

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
  if (meta.account_type !== "seller") {
    res.status(403).json({ error: "Seller account required" })
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

  const { data, metadata } = await query.graph({
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
    ],
    filters: {
      // Note: filtering by metadata isn't a first-class Medusa filter, so
      // we fetch a generous page and filter in memory. For a real store
      // with many sellers, replace this with a dedicated link table.
    },
    pagination: { take: 200, skip: 0 },
  })

  const ours = (data ?? []).filter(
    (p) =>
      (p as { metadata?: Record<string, unknown> })?.metadata
        ?.seller_customer_id === customer.id
  )

  res.json({ products: ours, count: ours.length, total: metadata?.count })
}

/** POST /store/seller/products — create a new draft listing. */
export async function POST(req: MedusaRequest, res: MedusaResponse) {
  const customer = await assertSeller(req, res)
  if (!customer) return

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
  }

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
            unit: body.unit ?? "kg",
            category: body.category ?? null,
            submitted_at: new Date().toISOString(),
          },
        },
      ],
    },
  })

  res.status(201).json({ product: result?.[0] })
}
