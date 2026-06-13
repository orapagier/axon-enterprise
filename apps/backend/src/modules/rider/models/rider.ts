import { model } from "@medusajs/framework/utils"

/**
 * A delivery rider, scoped to one hub. First-class entity so COD cash can be
 * traced to a person (the rider_id on dispatch_order / cod_transaction
 * references this record) and so riders can be flagged/suspended for unremitted
 * cash.
 *
 * `email` is how a rider is matched to their storefront login: riders sign in
 * as a normal customer (OTP / Google), and GET /store/riders/session matches
 * customer.email ↔ rider.email to mint the rider token. Stored lowercased;
 * unique among live rows (partial index in the migration).
 *
 * Riders self-register from the storefront account (POST /store/riders/register)
 * and land as "pending" — they can't work deliveries until a hub admin approves
 * them (sets status "active") after collecting the cash bond at the counter.
 *
 * `pin_hash` is vestigial: it backed the retired rider-PWA phone+PIN login. It
 * is kept (harmless, nullable) rather than dropped in a migration.
 */
const Rider = model
  .define("rider", {
    id: model.id().primaryKey(),
    full_name: model.text(),
    phone: model.text().unique(),
    email: model.text().nullable(),
    hub_id: model.text(),
    status: model
      .enum(["pending", "active", "inactive", "suspended"])
      .default("active"),
    pin_hash: model.text().nullable(),
    notes: model.text().nullable(),
  })
  .indexes([{ on: ["hub_id"], where: "deleted_at IS NULL" }])

export default Rider
