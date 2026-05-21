import { model } from "@medusajs/framework/utils"
import PickupSlot from "./pickup-slot"

const PickupWindow = model.define("pickup_window", {
  id: model.id().primaryKey(),
  hub_id: model.text(),
  hub_area_id: model.text(),
  date: model.dateTime(),
  start_time: model.text(),
  end_time: model.text(),
  capacity_kg: model.number().nullable(),
  reserved_kg: model.number().default(0),
  status: model
    .enum(["open", "full", "closed", "completed"])
    .default("open"),
  slots: model.hasMany(() => PickupSlot, { mappedBy: "pickup_window" }),
})

export default PickupWindow