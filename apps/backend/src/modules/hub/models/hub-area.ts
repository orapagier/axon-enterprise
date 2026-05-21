import { model } from "@medusajs/framework/utils"
import Hub from "./hub"

const HubArea = model.define("hub_area", {
  id: model.id().primaryKey(),
  name: model.text(),
  postal_codes: model.json(),
  barangays: model.json(),
  pickup_day_of_week: model.json().nullable(),
  hub: model.belongsTo(() => Hub, { mappedBy: "areas" }),
})

export default HubArea
