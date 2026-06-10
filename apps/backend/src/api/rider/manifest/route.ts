import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"
import { DISPATCH_MODULE } from "../../../modules/dispatch"
import type DispatchModuleService from "../../../modules/dispatch/service"
import { getRiderId } from "../../../lib/rider-auth"

/**
 * GET /rider/manifest
 *
 * The rider's active delivery list: their dispatch orders in a batch that's
 * locked or in_transit and not yet completed, ordered by manifest_position,
 * each enriched with the order's delivery details and COD amount.
 */
export async function GET(req: MedusaRequest, res: MedusaResponse) {
  const riderId = getRiderId(req)
  const dispatchService: DispatchModuleService =
    req.scope.resolve(DISPATCH_MODULE)
  const query = req.scope.resolve(ContainerRegistrationKeys.QUERY)

  const dispatchOrders = await dispatchService.listDispatchOrders(
    { rider_id: riderId },
    {
      take: 200,
      order: { manifest_position: "ASC" },
      relations: ["dispatch_batch"],
    }
  )

  const active = dispatchOrders.filter((o) => {
    const status = (o as unknown as { dispatch_batch?: { status?: string } })
      .dispatch_batch?.status
    return (
      (status === "locked" || status === "in_transit") &&
      o.delivery_status === "pending"
    )
  })

  const orderIds = active.map((o) => o.order_id)
  let orderMap: Record<string, unknown> = {}
  if (orderIds.length) {
    const { data } = await query.graph({
      entity: "order",
      fields: [
        "id",
        "display_id",
        "total",
        "shipping_address.first_name",
        "shipping_address.last_name",
        "shipping_address.phone",
        "shipping_address.address_1",
        "shipping_address.city",
        "shipping_address.metadata",
        "metadata",
      ],
      filters: { id: orderIds },
    })
    orderMap = Object.fromEntries(
      (data as Array<{ id: string }>).map((o) => [o.id, o])
    )
  }

  const manifest = active.map((o) => ({
    dispatch_order_id: o.id,
    order_id: o.order_id,
    manifest_position: o.manifest_position,
    batch_status: (o as unknown as { dispatch_batch?: { status?: string } })
      .dispatch_batch?.status,
    delivery_status: o.delivery_status,
    order: orderMap[o.order_id] ?? null,
  }))

  res.json({ manifest, count: manifest.length })
}
