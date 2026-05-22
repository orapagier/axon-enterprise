import { model } from "@medusajs/framework/utils"
import DispatchBatch from "./dispatch-batch"

const DispatchOrder = model.define("dispatch_order", {
  id: model.id().primaryKey(),
  order_id: model.text(),
  rider_id: model.text().nullable(),
  manifest_position: model.number().default(0),
  delivered_at: model.dateTime().nullable(),
  delivery_status: model
    .enum(["pending", "delivered", "refused", "missed", "disputed"])
    .default("pending"),
  dispatch_batch: model.belongsTo(() => DispatchBatch, { mappedBy: "orders" }),
})

export default DispatchOrder
