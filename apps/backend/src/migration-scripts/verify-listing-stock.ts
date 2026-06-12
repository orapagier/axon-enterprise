/**
 * Smoke test for src/lib/listing-stock.ts — creates a throwaway managed
 * product, sets stock, reads it back, restocks, then deletes the product.
 *
 * Run with:
 *   npx medusa exec ./src/migration-scripts/verify-listing-stock.ts
 */
import { ExecArgs } from "@medusajs/framework/types"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"
import {
  createProductsWorkflow,
  deleteProductsWorkflow,
} from "@medusajs/medusa/core-flows"
import { getVariantStock, setVariantStock } from "../lib/listing-stock"

export default async function verifyListingStock({ container }: ExecArgs) {
  const logger = container.resolve(ContainerRegistrationKeys.LOGGER)
  const query = container.resolve(ContainerRegistrationKeys.QUERY)

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

  const { result } = await createProductsWorkflow(container).run({
    input: {
      products: [
        {
          title: "STOCK VERIFY — delete me",
          handle: `stock-verify-${Date.now()}`,
          status: "draft",
          shipping_profile_id: shippingProfiles?.[0]?.id,
          sales_channels: salesChannels?.[0]?.id
            ? [{ id: salesChannels[0].id }]
            : [],
          options: [{ title: "Size", values: ["Default"] }],
          variants: [
            {
              title: "Default",
              manage_inventory: true,
              options: { Size: "Default" },
              prices: [{ amount: 100, currency_code: "php" }],
            },
          ],
        },
      ],
    },
  })

  const product = result?.[0] as
    | { id: string; variants?: { id: string }[] }
    | undefined
  if (!product?.id) throw new Error("product creation failed")
  logger.info(`created product ${product.id}`)

  try {
    let variantId = product.variants?.[0]?.id
    if (!variantId) {
      const { data } = await query.graph({
        entity: "product",
        fields: ["id", "variants.id"],
        filters: { id: product.id },
      })
      variantId = (data?.[0] as { variants?: { id: string }[] })?.variants?.[0]
        ?.id
    }
    if (!variantId) throw new Error("no variant found on created product")
    logger.info(`variant ${variantId}`)

    await setVariantStock(container, variantId, 42)
    const stock1 = await getVariantStock(container, variantId)
    logger.info(`stock after set(42): ${stock1}`)
    if (stock1 !== 42) throw new Error(`expected 42, got ${stock1}`)

    await setVariantStock(container, variantId, 7)
    const stock2 = await getVariantStock(container, variantId)
    logger.info(`stock after restock(7): ${stock2}`)
    if (stock2 !== 7) throw new Error(`expected 7, got ${stock2}`)

    logger.info("✅ listing-stock verified (set + upsert restock + read-back)")
  } finally {
    await deleteProductsWorkflow(container).run({
      input: { ids: [product.id] },
    })
    logger.info(`cleaned up product ${product.id}`)
  }
}
