import { ExecArgs } from "@medusajs/framework/types"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"

export default async function testHubProducts({ container }: ExecArgs) {
  const query = container.resolve(ContainerRegistrationKeys.QUERY)

  console.log("--- Testing hub → product link ---")
  try {
    const { data } = await query.graph({
      entity: "hub",
      fields: ["id", "product.id"],
      filters: { id: "01KS4TYKE280NSH40MSEN5QV9J" },
    })
    console.log("Result:", JSON.stringify(data, null, 2))
  } catch (err) {
    console.error("FAILED:", err)
  }
}
