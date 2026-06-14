import { model } from "@medusajs/framework/utils"

/**
 * The attribution + reward record for a single referred customer (the referee).
 *
 * One row per referee (unique `referee_customer_id`) — this is what enforces
 * "one bonus per person, ever": the reward is granted on the referee's FIRST
 * premium upgrade and the unique index makes a second grant impossible. We
 * never traverse past the direct referrer, so only 1st-level referrals earn.
 *
 *   status pending  — attribution recorded but the credit promotion couldn't be
 *                     issued yet (e.g. promotion API hiccup); retriable.
 *   status rewarded — the ₱50 store-credit promotion was issued to the referrer.
 *   status void     — manually invalidated (abuse / reversal).
 *
 * Amounts are in centavos to match the cod-ledger / producer-payout convention
 * (`model.number()` → numeric column).
 */
const Referral = model
  .define("referral", {
    id: model.id().primaryKey(),
    referrer_customer_id: model.text(),
    referee_customer_id: model.text(),
    referee_email: model.text().nullable(),
    code_used: model.text().nullable(),
    status: model.enum(["pending", "rewarded", "void"]).default("pending"),
    reward_amount_centavos: model.number().nullable(),
    reward_promo_id: model.text().nullable(),
    reward_promo_code: model.text().nullable(),
    rewarded_at: model.dateTime().nullable(),
  })
  .indexes([
    { on: ["referee_customer_id"], unique: true, where: "deleted_at IS NULL" },
    { on: ["referrer_customer_id"], where: "deleted_at IS NULL" },
  ])

export default Referral
