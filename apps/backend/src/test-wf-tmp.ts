import { ExecArgs } from "@medusajs/framework/types"
import { updateCartWorkflow } from "@medusajs/medusa/core-flows"

export default async function({ container }: ExecArgs) {
  const query = container.resolve("query")
  const { data: carts } = await query.graph({
    entity: "cart",
    fields: ["id"],
    pagination: { take: 1, order: { created_at: "DESC" } },
  })
  const cartId = carts[0].id

  await updateCartWorkflow(container).run({
    input: {
      id: cartId,
      shipping_address: { city: "Tagum City", address_1: "WF Test", country_code: "ph", metadata: { barangay: "WFBRGY" } } as any,
    },
  })

  const { data: after } = await query.graph({
    entity: "cart",
    fields: ["id","shipping_address.id","shipping_address.address_1","shipping_address.metadata"],
    filters: { id: cartId },
  })
  console.log("AFTER workflow:", JSON.stringify(after[0].shipping_address))
}
