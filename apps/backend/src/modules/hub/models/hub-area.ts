import { model } from "@medusajs/framework/utils"
import Hub from "./hub"

const HubArea = model.define("hub_area", {
  id: model.id().primaryKey(),
  name: model.text(),
  postal_codes: model.json(), // string[]
  barangays: model.json(),   // string[]
  pickup_day_of_week: model.json().nullable(), // int[] 0=Sun..6=Sat
  hub_id: model.belongsTo(() => Hub, { mappedBy: "areas" }),
})

export default HubArea