import { ExecArgs } from "@medusajs/framework/types"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"

export default async function testLinkQuery({ container }: ExecArgs) {
  const query = container.resolve(ContainerRegistrationKeys.QUERY)

  console.log("--- Testing product → product_listing link ---")

  const { data } = await query.graph({
    entity: "product",
    fields: [
      "id",
      "title",
      "status",
      "product_listing.id",
      "product_listing.status",
    ],
    filters: { id: "prod_01KSGK1AX0J4YY2XXY8NF7A60B" },
  })

  console.log("Result:", JSON.stringify(data, null, 2))

  console.log("\n--- Testing product_listing → product link ---")

  const { data: data2 } = await query.graph({
    entity: "product_listing",
    fields: [
      "id",
      "status",
      "product.id",
      "product.title",
    ],
    filters: { id: "01KSGK1B104C7B5PY3NPV0JM20" },
  })

  console.log("Result:", JSON.stringify(data2, null, 2))
}
