import { model } from "@medusajs/framework/utils"

const HubBarangayFee = model.define("hub_barangay_fee", {
  id: model.id().primaryKey(),
  hub_id: model.text(),
  barangay: model.text(),
  standard_fee_php: model.number(),
  special_fee_php: model.number(),
  active: model.boolean().default(true),
}).indexes([
  { on: ["hub_id", "barangay"], unique: true, where: "deleted_at IS NULL" },
])

export default HubBarangayFee
