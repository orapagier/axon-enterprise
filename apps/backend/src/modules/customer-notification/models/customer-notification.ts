import { model } from "@medusajs/framework/utils"

/**
 * An in-app notification for a single customer — the rows behind the header
 * bell + the /account/notifications inbox.
 *
 * Every per-customer event that already fires a Web Push (order received,
 * delivery in transit / delivered, producer confirm window, dispute reminders)
 * also drops one of these via src/lib/notify-customer.ts, so the inbox and the
 * push stay in lock-step from a single call site.
 *
 *  - `type` is a coarse category ("order" | "delivery" | "dispute" | …) the
 *    storefront uses for the icon/colour. Nullable so a generic notice is fine.
 *  - `url` is a storefront-relative deep link to the related page (e.g.
 *    /account/orders) shown as the "View" affordance on the detail screen.
 *  - `tag` collapses repeats: a notification carrying a tag updates the
 *    existing UNREAD row with the same (customer_id, tag) instead of stacking
 *    duplicates, so a job that nudges the same order leaves one fresh item.
 *  - `read_at` is null until the customer opens it (or hits "mark all read").
 */
const CustomerNotification = model
  .define("customer_notification", {
    id: model.id().primaryKey(),
    customer_id: model.text(),
    type: model.text().nullable(),
    title: model.text(),
    body: model.text(),
    url: model.text().nullable(),
    tag: model.text().nullable(),
    read_at: model.dateTime().nullable(),
    data: model.json().nullable(),
  })
  .indexes([
    { on: ["customer_id"], where: "deleted_at IS NULL" },
    {
      on: ["customer_id", "tag"],
      where: "deleted_at IS NULL AND read_at IS NULL",
    },
  ])

export default CustomerNotification
