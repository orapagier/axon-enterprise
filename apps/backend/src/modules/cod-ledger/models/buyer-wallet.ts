import { model } from "@medusajs/framework/utils"

const BuyerWallet = model.define("buyer_wallet", {
  id: model.id().primaryKey(),
  customer_id: model.text().unique(),
  deposit_balance: model.number().default(0),
  status: model
    .enum(["none", "pending_verification", "verified"])
    .default("none"),
  payment_reference: model.text().nullable(),
  verified_at: model.dateTime().nullable(),
})

export default BuyerWallet
