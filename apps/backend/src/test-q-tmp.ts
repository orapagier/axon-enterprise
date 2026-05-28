import { ExecArgs } from "@medusajs/framework/types"
export default async function({ container }: ExecArgs) {
  const query = container.resolve("query")
  const { data } = await query.graph({
    entity: "cart",
    fields: ["id","region_id","shipping_address.first_name","shipping_address.city","shipping_address.address_1","shipping_address.metadata"],
    filters: { id: "cart_01KSPAGWJ95CKQPEBA8RESBWHD" },
  })
  console.log(JSON.stringify(data[0], null, 2))
}
