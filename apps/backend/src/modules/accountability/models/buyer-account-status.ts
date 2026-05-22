import { model } from "@medusajs/framework/utils"

const BuyerAccountStatus = model.define("buyer_account_status", {
  id: model.id().primaryKey(),
  customer_id: model.text().unique(),
  strike_count: model.number().default(0),
  state: model
    .enum([
      "normal",
      "warned",
      "prepay_locked_30d",
      "prepay_locked_permanent",
    ])
    .default("normal"),
  state_until: model.dateTime().nullable(),
  last_clean_order_at: model.dateTime().nullable(),
  recovery_eligible_at: model.dateTime().nullable(),
})

export default BuyerAccountStatus
