import { model } from "@medusajs/framework/utils"

const Hub = model.define("hub", {
  id: model.id().primaryKey(),
  name: model.text(),
  slug: model.text().unique(),
  city: model.text(),
  province: model.text(),
  country: model.text().default("ph"),
  active: model.boolean().default(true),
  dispatch_cutoff: model.text().default("12:00"),
  dispatch_time: model.text().default("16:00"),
  timezone: model.text().default("Asia/Manila"),
  areas: model.hasMany(() => import("./hub-area").then((m) => m.default), {
    mappedBy: "hub_id",
  }),
})

export default Hub