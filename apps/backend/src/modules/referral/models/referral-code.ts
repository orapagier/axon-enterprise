import { model } from "@medusajs/framework/utils"

/**
 * One sharable referral code per customer. The code is the human-facing token
 * a referrer hands out (via link `?ref=CODE` or typed on the upgrade form). It
 * is created lazily the first time a customer opens their referral panel, so
 * accounts that never refer anyone never get a row.
 *
 * `customer_id` and `code` are both unique — a customer has exactly one code,
 * and a code resolves to exactly one referrer.
 */
const ReferralCode = model
  .define("referral_code", {
    id: model.id().primaryKey(),
    customer_id: model.text(),
    code: model.text(),
  })
  .indexes([
    { on: ["customer_id"], unique: true, where: "deleted_at IS NULL" },
    { on: ["code"], unique: true, where: "deleted_at IS NULL" },
  ])

export default ReferralCode
