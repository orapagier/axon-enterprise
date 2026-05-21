import { model } from "@medusajs/framework/utils"
import PickupWindow from "./pickup-window"

const PickupSlot = model.define("pickup_slot", {
  id: model.id().primaryKey(),
  listing_id: model.text(),
  estimated_kg: model.number(),
  status: model
    .enum(["reserved", "picked_up", "no_show", "rejected"])
    .default("reserved"),
  picked_up_at: model.dateTime().nullable(),
  notes: model.text().nullable(),
  pickup_window: model.belongsTo(() => PickupWindow, { mappedBy: "slots" }),
})

export default PickupSlot