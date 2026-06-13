import { model } from "@medusajs/framework/utils"

/**
 * A Web Push subscription belonging to a customer (consumer). One row per
 * browser/device that opted in to delivery notifications. The triple
 * (endpoint, p256dh, auth) is what the Web Push protocol needs to encrypt and
 * deliver a push to that device; `endpoint` is the unique key (the browser
 * mints a fresh one per subscription and rotates it if it expires).
 *
 * Subscriptions are pruned automatically when a push returns 404/410 (the
 * browser dropped it) — see src/lib/push.ts.
 */
const PushSubscription = model
  .define("push_subscription", {
    id: model.id().primaryKey(),
    customer_id: model.text(),
    endpoint: model.text().unique(),
    p256dh: model.text(),
    auth: model.text(),
    user_agent: model.text().nullable(),
  })
  .indexes([{ on: ["customer_id"], where: "deleted_at IS NULL" }])

export default PushSubscription
