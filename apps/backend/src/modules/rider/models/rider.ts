import { model } from "@medusajs/framework/utils"

/**
 * A delivery rider, scoped to one hub. First-class entity so COD cash can be
 * traced to a person (the rider_id on dispatch_order / cod_transaction now
 * references this record) and so riders can be flagged/suspended for unremitted
 * cash. `pin_hash` backs the phone+PIN login (set at signup).
 * `email` is the rider's Google account: the rider-app Google sign-in
 * (/rider/auth/google/*) matches the verified Google email against it. Stored
 * lowercased; unique among live rows (partial index in the migration).
 *
 * Riders self-register at POST /rider/auth/signup and land as "pending" —
 * they can't log in until a hub admin approves them (sets status "active")
 * after collecting the cash bond at the counter.
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
