/**
 * One-off: add the "Miscellaneous" catch-all product category so producers
 * have a home for items that don't fit a staple aisle.
 *
 * Idempotent — keyed by handle, safe to re-run.
 *
 * Run with:
 *   npx medusa exec ./src/migration-scripts/add-misc-category.ts
 */
import { ExecArgs } from "@medusajs/framework/types"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"
import { createProductCategoriesWorkflow } from "@medusajs/medusa/core-flows"

const HANDLE = "misc"

export default async function addMiscCategory({ container }: ExecArgs) {
  const logger = container.resolve(ContainerRegistrationKeys.LOGGER)
  const query = container.resolve(ContainerRegistrationKeys.QUERY)

  const { data: existing } = await query.graph({
    entity: "product_category",
    fields: ["id", "handle"],
    pagination: { take: 200 },
  })
  if ((existing ?? []).some((c) => c.handle === HANDLE)) {
    logger.info(`Category "${HANDLE}" already exists — nothing to do.`)
    return
  }

  const { result } = await createProductCategoriesWorkflow(container).run({
    input: {
      product_categories: [
        {
          name: "Miscellaneous",
          handle: HANDLE,
          description: "Everything else — items that don't fit another aisle.",
          is_active: true,
          is_internal: false,
        },
      ],
    },
  })
  logger.info(`Created category "Miscellaneous" (${result?.[0]?.id}).`)
}
