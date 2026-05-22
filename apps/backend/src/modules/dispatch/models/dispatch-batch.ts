import { model } from "@medusajs/framework/utils"
import DispatchOrder from "./dispatch-order"

const DispatchBatch = model.define("dispatch_batch", {
  id: model.id().primaryKey(),
  hub_id: model.text(),
  dispatch_date: model.dateTime(),
  cutoff_at: model.dateTime(),
  dispatched_at: model.dateTime().nullable(),
  status: model
    .enum(["collecting", "locked", "in_transit", "completed"])
    .default("collecting"),
  orders: model.hasMany(() => DispatchOrder, { mappedBy: "dispatch_batch" }),
})

export default DispatchBatch
