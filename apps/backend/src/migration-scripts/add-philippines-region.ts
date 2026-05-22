/**
 * Adds the Philippines region with PHP currency to the existing store.
 *
 * Run once with:
 *   npx medusa exec ./src/migration-scripts/add-philippines-region.ts
 *
 * Idempotent: re-running skips any objects that already exist.
 */
import { ExecArgs } from "@medusajs/framework/types"
import {
  ContainerRegistrationKeys,
  Modules,
} from "@medusajs/framework/utils"
import {
  createRegionsWorkflow,
  createShippingOptionsWorkflow,
  createStockLocationsWorkflow,
  createTaxRegionsWorkflow,
  updateStoresWorkflow,
} from "@medusajs/medusa/core-flows"

const PH_COUNTRY = "ph"
const PH_CURRENCY = "php"

export default async function addPhilippinesRegion({ container }: ExecArgs) {
  const logger = container.resolve(ContainerRegistrationKeys.LOGGER)
  const link = container.resolve(ContainerRegistrationKeys.LINK)
  const query = container.resolve(ContainerRegistrationKeys.QUERY)
  const fulfillmentModuleService = container.resolve(Modules.FULFILLMENT)
  const regionModule = container.resolve(Modules.REGION)
  const stockLocationModule = container.resolve(Modules.STOCK_LOCATION)
  const storeModule = container.resolve(Modules.STORE)

  // 1. Make sure PHP is a supported currency on the store and is the default.
  logger.info("Ensuring store supports PHP as the default currency…")
  const stores = await storeModule.listStores({})
  const store = stores[0]
  if (!store) {
    logger.error("No store found. Run the initial seed first.")
    return
  }

  const existingCurrencies = store.supported_currencies ?? []
  const hasPhp = existingCurrencies.some((c) => c.currency_code === PH_CURRENCY)
  if (!hasPhp) {
    await updateStoresWorkflow(container).run({
      input: {
        selector: { id: store.id },
        update: {
          supported_currencies: [
            ...existingCurrencies.map((c) => ({
              currency_code: c.currency_code,
              is_default: false,
            })),
            { currency_code: PH_CURRENCY, is_default: true },
          ],
        },
      },
    })
    logger.info("Added PHP to store supported_currencies (set as default).")
  } else {
    // ensure PHP is marked default
    await updateStoresWorkflow(container).run({
      input: {
        selector: { id: store.id },
        update: {
          supported_currencies: existingCurrencies.map((c) => ({
            currency_code: c.currency_code,
            is_default: c.currency_code === PH_CURRENCY,
          })),
        },
      },
    })
    logger.info("PHP already supported; ensured it's marked as default.")
  }

  // 2. Create the Philippines region if missing.
  logger.info("Checking for existing Philippines region…")
  const existingRegions = await regionModule.listRegions({})
  let phRegion = existingRegions.find(
    (r) =>
      r.name?.toLowerCase() === "philippines" ||
      r.currency_code?.toLowerCase() === PH_CURRENCY
  )

  if (!phRegion) {
    const { result } = await createRegionsWorkflow(container).run({
      input: {
        regions: [
          {
            name: "Philippines",
            currency_code: PH_CURRENCY,
            countries: [PH_COUNTRY],
            payment_providers: ["pp_system_default"],
          },
        ],
      },
    })
    phRegion = result[0]
    logger.info(`Created region: Philippines (${phRegion.id}).`)
  } else {
    logger.info("Philippines region already exists; skipping create.")
  }

  // 3. Tax region for PH.
  logger.info("Ensuring PH tax region…")
  try {
    await createTaxRegionsWorkflow(container).run({
      input: [{ country_code: PH_COUNTRY, provider_id: "tp_system" }],
    })
    logger.info("Created PH tax region.")
  } catch (err) {
    logger.info(`PH tax region already exists or skipped: ${String(err)}`)
  }

  // 4. Stock location in Mindanao (created if no PH location exists).
  logger.info("Checking for a PH stock location…")
  const existingLocations = await stockLocationModule.listStockLocations({})
  let phLocation = existingLocations.find(
    (l) =>
      (l.address as { country_code?: string } | null)?.country_code?.toLowerCase() ===
      PH_COUNTRY
  )

  if (!phLocation) {
    const { result } = await createStockLocationsWorkflow(container).run({
      input: {
        locations: [
          {
            name: "Mindanao Hub",
            address: {
              city: "Davao City",
              country_code: "PH",
              address_1: "Mindanao Fresh Hub Warehouse",
            },
          },
        ],
      },
    })
    phLocation = result[0]
    logger.info(`Created stock location: Mindanao Hub (${phLocation.id}).`)
  } else {
    logger.info("PH stock location already present.")
  }

  try {
    await link.create({
      [Modules.STOCK_LOCATION]: { stock_location_id: phLocation.id },
      [Modules.FULFILLMENT]: { fulfillment_provider_id: "manual_manual" },
    })
  } catch (err) {
    // Re-runs will hit a duplicate link; treat as no-op.
    logger.info(
      `Stock-location ↔ manual_manual provider already linked: ${String(err)}`
    )
  }

  // 5. Fulfillment set + service zone for PH.
  logger.info("Ensuring PH fulfillment set + service zone…")
  const existingSets = await fulfillmentModuleService.listFulfillmentSets(
    { name: "Philippines delivery" },
    { relations: ["service_zones"] }
  )
  let fulfillmentSet = existingSets[0]
  if (!fulfillmentSet) {
    fulfillmentSet = await fulfillmentModuleService.createFulfillmentSets({
      name: "Philippines delivery",
      type: "shipping",
      service_zones: [
        {
          name: "Philippines",
          geo_zones: [{ country_code: PH_COUNTRY, type: "country" }],
        },
      ],
    })
    logger.info(`Created fulfillment set: Philippines delivery (${fulfillmentSet.id}).`)
  } else {
    logger.info("Philippines delivery fulfillment set already exists; reusing.")
  }

  try {
    await link.create({
      [Modules.STOCK_LOCATION]: { stock_location_id: phLocation.id },
      [Modules.FULFILLMENT]: { fulfillment_set_id: fulfillmentSet.id },
    })
  } catch (err) {
    logger.info(
      `Stock-location ↔ fulfillment-set already linked: ${String(err)}`
    )
  }

  // 6. Shipping option (Standard).
  const { data: shippingProfiles } = await query.graph({
    entity: "shipping_profile",
    fields: ["id"],
  })
  const shippingProfile = shippingProfiles[0]

  if (shippingProfile) {
    await createShippingOptionsWorkflow(container).run({
      input: [
        {
          name: "Standard Delivery",
          price_type: "flat",
          provider_id: "manual_manual",
          service_zone_id: fulfillmentSet.service_zones[0].id,
          shipping_profile_id: shippingProfile.id,
          type: {
            label: "Standard",
            description: "Next-day delivery across major Mindanao cities.",
            code: "standard",
          },
          prices: [
            { currency_code: PH_CURRENCY, amount: 150 },
            { region_id: phRegion.id, amount: 150 },
          ],
          rules: [
            {
              attribute: "enabled_in_store",
              value: "true",
              operator: "eq",
            },
            {
              attribute: "is_return",
              value: "false",
              operator: "eq",
            },
          ],
        },
      ],
    })
    logger.info("Created Standard Delivery shipping option for PH.")
  } else {
    logger.warn(
      "No shipping_profile found — skipped shipping option. Run the initial seed first."
    )
  }

  logger.info("✅ Philippines region setup complete.")
}
