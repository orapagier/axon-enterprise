import { ExecArgs } from "@medusajs/framework/types"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"

export default async function testHubProducts({ container }: ExecArgs) {
  const query = container.resolve(ContainerRegistrationKeys.QUERY)

  // Test with "product" (singular)
  try {
    const { data } = await query.graph({
      entity: "hub",
      fields: ["id", "product.id"],
      filters: { id: "01KS4TYKE280NSH40MSEN5QV9J" },
    })
    console.log("product (singular):", JSON.stringify(data, null, 2))
  } catch (err) {
    console.log("product (singular) FAILED:", (err as Error).message)
  }

  // Test with "products" (plural)
  try {
    const { data } = await query.graph({
      entity: "hub",
      fields: ["id", "products.id"],
      filters: { id: "01KS4TYKE280NSH40MSEN5QV9J" },
    })
    console.log("products (plural):", JSON.stringify(data, null, 2))
  } catch (err) {
    console.log("products (plural) FAILED:", (err as Error).message)
  }
}
