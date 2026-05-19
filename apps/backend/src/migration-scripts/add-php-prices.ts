/**
 * Adds PHP prices to every variant that doesn't have one yet.
 * Converts existing EUR prices to PHP at a fixed rate (1 EUR ≈ 64 PHP),
 * rounded to the nearest peso.
 *
 * Run with:
 *   npx medusa exec ./src/migration-scripts/add-php-prices.ts
 *
 * Idempotent: variants already priced in PHP are skipped.
 */
import { ExecArgs } from "@medusajs/framework/types"
import {
  ContainerRegistrationKeys,
  Modules,
} from "@medusajs/framework/utils"
import { updatePricePreferencesWorkflow } from "@medusajs/medusa/core-flows"

const PH_CURRENCY = "php"
const EUR_TO_PHP = 64 // simple fixed conversion

export default async function addPhpPrices({ container }: ExecArgs) {
  const logger = container.resolve(ContainerRegistrationKeys.LOGGER)
  const pricingModule = container.resolve(Modules.PRICING)
  const query = container.resolve(ContainerRegistrationKeys.QUERY)

  logger.info("Loading all product variants with their price sets…")

  const { data: variants } = await query.graph({
    entity: "product_variant",
    fields: [
      "id",
      "title",
      "product.title",
      "price_set.id",
      "price_set.prices.id",
      "price_set.prices.amount",
      "price_set.prices.currency_code",
    ],
  })

  let updated = 0
  let skipped = 0

  for (const variant of variants ?? []) {
    const priceSet = (variant as { price_set?: { id: string; prices: { amount: number; currency_code: string }[] } | null }).price_set
    if (!priceSet?.id) {
      skipped++
      continue
    }
    const prices = priceSet.prices ?? []
    const hasPhp = prices.some((p) => p.currency_code?.toLowerCase() === PH_CURRENCY)
    if (hasPhp) {
      skipped++
      continue
    }

    const eurPrice = prices.find(
      (p) => p.currency_code?.toLowerCase() === "eur"
    )
    const sourceAmount = eurPrice?.amount ?? null
    const phpAmount =
      sourceAmount !== null && sourceAmount > 0
        ? Math.max(1, Math.round(sourceAmount * EUR_TO_PHP))
        : 100

    await pricingModule.addPrices({
      priceSetId: priceSet.id,
      prices: [
        {
          amount: phpAmount,
          currency_code: PH_CURRENCY,
        },
      ],
    })
    logger.info(
      `Added ₱${phpAmount} to variant ${variant.id} (${(variant as { title?: string }).title ?? "?"})`
    )
    updated++
  }

  // ensure price preferences allow PHP
  try {
    await updatePricePreferencesWorkflow(container).run({
      input: {
        selector: { attribute: "currency_code", value: PH_CURRENCY },
        update: { is_tax_inclusive: false },
      },
    })
  } catch {
    // ignore if no preferences exist
  }

  logger.info(`✅ Done. Updated ${updated}, skipped ${skipped}.`)
}
