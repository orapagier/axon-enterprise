import { model } from "@medusajs/framework/utils"
import HubArea from "./hub-area"

const Hub = model.define("hub", {
  id: model.id().primaryKey(),
  name: model.text(),
  slug: model.text().unique(),
  city: model.text(),
  province: model.text(),
  country: model.text().default("ph"),
  timezone: model.text().default("Asia/Manila"),
  dispatch_cutoff: model.text().default("12:00"),
  dispatch_time: model.text().default("16:00"),
  active: model.boolean().default(true),
  areas: model.hasMany(() => HubArea, { mappedBy: "hub" }),
})

export default Hub
