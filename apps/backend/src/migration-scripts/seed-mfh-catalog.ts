/**
 * Seeds the Mindanao Fresh Hub catalog with realistic produce sourced from
 * across Mindanao. Day-1 inventory so the storefront has something honest to
 * show buyers.
 *
 * Idempotent:
 *   - Categories created only if missing (keyed by handle).
 *   - Products created only if missing (keyed by handle).
 *   - Safe to re-run after adding new entries to the list below.
 *
 * Run with:
 *   npx medusa exec ./src/migration-scripts/seed-mfh-catalog.ts
 */
import { ExecArgs } from "@medusajs/framework/types"
import {
  ContainerRegistrationKeys,
  ProductStatus,
} from "@medusajs/framework/utils"
import {
  createProductCategoriesWorkflow,
  createProductsWorkflow,
} from "@medusajs/medusa/core-flows"

const CURRENCY = "php"

type CategoryDef = {
  name: string
  handle: string
  description: string
}

const CATEGORIES: CategoryDef[] = [
  { name: "Fruits", handle: "fruits", description: "Sweet, sun-ripened Mindanao fruit." },
  { name: "Vegetables", handle: "vegetables", description: "Crisp, freshly-picked vegetables." },
  { name: "Leafy Greens", handle: "leafy-greens", description: "Greens harvested the morning of dispatch." },
  { name: "Root Crops", handle: "root-crops", description: "Ground-grown staples for everyday cooking." },
  { name: "Herbs", handle: "herbs", description: "Aromatics from highland and coastal farms." },
  { name: "Fish", handle: "fish", description: "Pond-raised and freshwater catch from Mindanao." },
  { name: "Miscellaneous", handle: "misc", description: "Everything else — items that don't fit another aisle." },
]

// Category-level fallback photos so every product has at least *some* image.
// Per-product overrides live alongside the product itself.
const CATEGORY_FALLBACK_PHOTO: Record<string, string> = {
  fruits:
    "https://images.unsplash.com/photo-1619566636858-adf3ef46400b?w=800&auto=format&fit=crop&q=80",
  vegetables:
    "https://images.unsplash.com/photo-1518977676601-b53f82aba655?w=800&auto=format&fit=crop&q=80",
  "leafy-greens":
    "https://images.unsplash.com/photo-1610348725531-843dff563e2c?w=800&auto=format&fit=crop&q=80",
  "root-crops":
    "https://images.unsplash.com/photo-1596097635121-14b38c5d7a55?w=800&auto=format&fit=crop&q=80",
  herbs:
    "https://images.unsplash.com/photo-1593013820066-87e9cda3a87d?w=800&auto=format&fit=crop&q=80",
  fish:
    "https://images.unsplash.com/photo-1518536881889-9c89f1bbd1da?w=800&auto=format&fit=crop&q=80",
}

type ProductDef = {
  title: string
  handle: string
  category: string // handle of the category above
  origin: string // Mindanao province / area
  unit: string // "kg" | "bundle" | "piece" — drives metadata.unit
  pricePhp: number // amount in pesos (whole)
  description: string
  thumbnail?: string // optional override; falls back to category photo
}

const PRODUCTS: ProductDef[] = [
  // ── Fruits ────────────────────────────────────────────────────────
  {
    title: "Carabao Mango",
    handle: "carabao-mango",
    category: "fruits",
    origin: "Bukidnon",
    unit: "kg",
    pricePhp: 180,
    description:
      "Famously fragrant yellow mango from highland Bukidnon. Eats sweet eaten ripe, perfect for shakes and desserts.",
    thumbnail:
      "https://images.unsplash.com/photo-1605027990121-cbae9e0642df?w=800&auto=format&fit=crop&q=80",
  },
  {
    title: "Sweet Pineapple",
    handle: "sweet-pineapple",
    category: "fruits",
    origin: "Bukidnon",
    unit: "piece",
    pricePhp: 95,
    description:
      "Field-ripened pineapple from the Bukidnon plateau — heavy, golden, no syrupy aftertaste.",
    thumbnail:
      "https://images.unsplash.com/photo-1550828520-4cb496926fc9?w=800&auto=format&fit=crop&q=80",
  },
  {
    title: "Lakatan Banana",
    handle: "lakatan-banana",
    category: "fruits",
    origin: "Davao del Norte",
    unit: "kg",
    pricePhp: 70,
    description:
      "Firm-textured, lightly tangy lakatan — the everyday breakfast banana of the region.",
    thumbnail:
      "https://images.unsplash.com/photo-1603833665858-e61d17a86224?w=800&auto=format&fit=crop&q=80",
  },
  {
    title: "Fresh Calamansi",
    handle: "fresh-calamansi",
    category: "fruits",
    origin: "Davao del Sur",
    unit: "kg",
    pricePhp: 110,
    description:
      "Tiny but punchy. Calamansi for marinades, drinks and that finishing squeeze on grilled fish.",
    thumbnail:
      "https://images.unsplash.com/photo-1582979512210-99b6a53386f9?w=800&auto=format&fit=crop&q=80",
  },
  {
    title: "Davao Pomelo",
    handle: "davao-pomelo",
    category: "fruits",
    origin: "Davao Region",
    unit: "piece",
    pricePhp: 150,
    description:
      "Davao's signature pomelo — pink-fleshed, juicy without being watery, easy to peel.",
  },

  // ── Vegetables ────────────────────────────────────────────────────
  {
    title: "Native Tomato",
    handle: "native-tomato",
    category: "vegetables",
    origin: "Bukidnon",
    unit: "kg",
    pricePhp: 120,
    description:
      "Highland-grown native tomato. Smaller than commercial varieties, deeper flavour.",
    thumbnail:
      "https://images.unsplash.com/photo-1518977822534-7049a61ee0c2?w=800&auto=format&fit=crop&q=80",
  },
  {
    title: "Eggplant",
    handle: "eggplant",
    category: "vegetables",
    origin: "Davao del Norte",
    unit: "kg",
    pricePhp: 65,
    description:
      "Slim purple eggplant — perfect for tortang talong, grilled, or simmered in coconut.",
  },
  {
    title: "Bell Pepper",
    handle: "bell-pepper",
    category: "vegetables",
    origin: "Bukidnon",
    unit: "kg",
    pricePhp: 220,
    description:
      "Mixed red and green peppers from cool highland farms. Thick walls, sweet centre.",
  },
  {
    title: "Ampalaya (Bitter Melon)",
    handle: "ampalaya",
    category: "vegetables",
    origin: "Davao Region",
    unit: "kg",
    pricePhp: 90,
    description:
      "Knobby, deep green ampalaya. Great with egg, beef, or simmered with monggo.",
  },
  {
    title: "Okra",
    handle: "okra",
    category: "vegetables",
    origin: "Davao Region",
    unit: "kg",
    pricePhp: 70,
    description:
      "Tender young okra picked the morning of dispatch. Pinakbet-ready.",
  },

  // ── Leafy Greens ───────────────────────────────────────────────────
  {
    title: "Kangkong",
    handle: "kangkong",
    category: "leafy-greens",
    origin: "Davao Region",
    unit: "bundle",
    pricePhp: 45,
    description:
      "Water spinach harvested at dawn. Crisp stems, tender leaves — adobo, sinigang, sautéed.",
  },
  {
    title: "Pechay (Bok Choy)",
    handle: "pechay",
    category: "leafy-greens",
    origin: "Davao Region",
    unit: "bundle",
    pricePhp: 55,
    description:
      "Local pechay — quick-wilting in soups and stir-fries.",
    thumbnail:
      "https://images.unsplash.com/photo-1611996575749-79a3a250f948?w=800&auto=format&fit=crop&q=80",
  },
  {
    title: "Highland Lettuce",
    handle: "highland-lettuce",
    category: "leafy-greens",
    origin: "Bukidnon",
    unit: "kg",
    pricePhp: 180,
    description:
      "Romaine and red-leaf mix from Bukidnon's cool highlands. For salads, wraps, sandwiches.",
    thumbnail:
      "https://images.unsplash.com/photo-1622206151226-18ca2c9ab4a1?w=800&auto=format&fit=crop&q=80",
  },
  {
    title: "Malunggay",
    handle: "malunggay",
    category: "leafy-greens",
    origin: "Davao Region",
    unit: "bundle",
    pricePhp: 40,
    description:
      "Moringa leaves and pods. Toss into tinola, monggo, or boil for a peppery tea.",
  },

  // ── Root Crops ─────────────────────────────────────────────────────
  {
    title: "Sweet Potato (Kamote)",
    handle: "sweet-potato",
    category: "root-crops",
    origin: "Davao del Sur",
    unit: "kg",
    pricePhp: 60,
    description:
      "Purple-skinned, yellow-fleshed kamote. Steam, fry, or simmer in ginataang halo-halo.",
  },
  {
    title: "Cassava",
    handle: "cassava",
    category: "root-crops",
    origin: "Bukidnon",
    unit: "kg",
    pricePhp: 40,
    description:
      "Fresh cassava for suman, bibingka, or grated into the classic cassava cake.",
  },
  {
    title: "Native Ginger (Luya)",
    handle: "native-ginger",
    category: "root-crops",
    origin: "Misamis Oriental",
    unit: "kg",
    pricePhp: 180,
    description:
      "Highland ginger — fragrant, fibrous, with the bite that good tinola needs.",
    thumbnail:
      "https://images.unsplash.com/photo-1599909533730-d9f30bb4a91d?w=800&auto=format&fit=crop&q=80",
  },

  // ── Herbs ──────────────────────────────────────────────────────────
  {
    title: "Native Garlic (Bawang)",
    handle: "native-garlic",
    category: "herbs",
    origin: "Davao Region",
    unit: "kg",
    pricePhp: 280,
    description:
      "Small cloves, big flavour. Native garlic for sinangag, marinades, and slow-cooked adobo.",
  },
  {
    title: "Lemongrass (Tanglad)",
    handle: "lemongrass",
    category: "herbs",
    origin: "Davao Region",
    unit: "bundle",
    pricePhp: 90,
    description:
      "Fresh tanglad. Bruise the stalks and tuck into roast lechon, tinola, or chicken inasal.",
  },

  // ── Fish ───────────────────────────────────────────────────────────
  {
    title: "Pond-Raised Tilapia",
    handle: "pond-tilapia",
    category: "fish",
    origin: "Davao del Norte",
    unit: "kg",
    pricePhp: 180,
    description:
      "Live-fresh tilapia, scaled and gutted to order. Grill, fry, or simmer in sinigang.",
    thumbnail:
      "https://images.unsplash.com/photo-1500964757637-c85e8a162699?w=800&auto=format&fit=crop&q=80",
  },
  {
    title: "Bangus (Milkfish)",
    handle: "bangus",
    category: "fish",
    origin: "South Cotabato",
    unit: "kg",
    pricePhp: 220,
    description:
      "Whole bangus from Sarangani Bay. Deboned on request, perfect for sinigang or daing.",
  },
]

export default async function seedMfhCatalog({ container }: ExecArgs) {
  const logger = container.resolve(ContainerRegistrationKeys.LOGGER)
  const query = container.resolve(ContainerRegistrationKeys.QUERY)

  logger.info("Seeding Mindanao Fresh Hub catalog…")

  // ── Resolve infra (sales channel + shipping profile) ──────────────
  const { data: salesChannels } = await query.graph({
    entity: "sales_channel",
    fields: ["id", "name"],
    pagination: { take: 5 },
  })
  const salesChannelId = salesChannels?.[0]?.id
  if (!salesChannelId) {
    throw new Error(
      "No sales channel found — run the initial seed first (`npm -w @dtc/backend run seed`)."
    )
  }

  const { data: shippingProfiles } = await query.graph({
    entity: "shipping_profile",
    fields: ["id", "name"],
    pagination: { take: 5 },
  })
  const shippingProfileId = shippingProfiles?.[0]?.id
  if (!shippingProfileId) {
    throw new Error(
      "No shipping profile found — run the initial seed first."
    )
  }

  // ── Categories (idempotent by handle) ─────────────────────────────
  const { data: existingCategories } = await query.graph({
    entity: "product_category",
    fields: ["id", "handle"],
    pagination: { take: 100 },
  })
  const categoryByHandle = new Map<string, string>()
  for (const c of existingCategories ?? []) {
    if (c.handle) categoryByHandle.set(c.handle, c.id)
  }

  const missingCategories = CATEGORIES.filter(
    (c) => !categoryByHandle.has(c.handle)
  )
  if (missingCategories.length) {
    logger.info(
      `Creating ${missingCategories.length} new categor${missingCategories.length === 1 ? "y" : "ies"}…`
    )
    const { result: created } = await createProductCategoriesWorkflow(
      container
    ).run({
      input: {
        product_categories: missingCategories.map((c) => ({
          name: c.name,
          handle: c.handle,
          description: c.description,
          is_active: true,
          is_internal: false,
        })),
      },
    })
    for (const cat of created ?? []) {
      if (cat.handle) categoryByHandle.set(cat.handle, cat.id)
    }
  }

  // ── Products (idempotent by handle) ───────────────────────────────
  const { data: existingProducts } = await query.graph({
    entity: "product",
    fields: ["id", "handle"],
    pagination: { take: 500 },
  })
  const existingHandles = new Set(
    (existingProducts ?? []).map((p) => p.handle).filter(Boolean)
  )

  const toCreate = PRODUCTS.filter((p) => !existingHandles.has(p.handle))
  if (!toCreate.length) {
    logger.info("All catalog products already present — nothing to seed.")
    return
  }

  logger.info(`Creating ${toCreate.length} new products…`)

  await createProductsWorkflow(container).run({
    input: {
      products: toCreate.map((p) => {
        const categoryId = categoryByHandle.get(p.category)
        const thumbnail =
          p.thumbnail ?? CATEGORY_FALLBACK_PHOTO[p.category] ?? undefined
        return {
          title: p.title,
          handle: p.handle,
          description: p.description,
          thumbnail,
          status: ProductStatus.PUBLISHED,
          origin_country: p.origin,
          shipping_profile_id: shippingProfileId,
          sales_channels: [{ id: salesChannelId }],
          category_ids: categoryId ? [categoryId] : undefined,
          options: [{ title: "Unit", values: [p.unit] }],
          variants: [
            {
              title: p.unit,
              sku: `MFH-${p.handle.toUpperCase()}`,
              manage_inventory: false,
              options: { Unit: p.unit },
              prices: [
                {
                  amount: p.pricePhp,
                  currency_code: CURRENCY,
                },
              ],
            },
          ],
          metadata: {
            unit: p.unit,
            category: p.category,
            seeded_at: new Date().toISOString(),
            source: "seed-mfh-catalog",
          },
          images: thumbnail ? [{ url: thumbnail }] : undefined,
        }
      }),
    },
  })

  logger.info(
    `Done. ${toCreate.length} products added. Refresh /ph/store on the storefront to see them.`
  )
}
