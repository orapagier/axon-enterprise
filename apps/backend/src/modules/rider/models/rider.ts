import { model } from "@medusajs/framework/utils"

/**
 * A delivery rider, scoped to one hub. First-class entity so COD cash can be
 * traced to a person (the rider_id on dispatch_order / cod_transaction now
 * references this record) and so riders can be flagged/suspended for unremitted
 * cash. `pin_hash` is reserved for the future rider self-service login slice.
 */
const Rider = model
  .define("rider", {
    id: model.id().primaryKey(),
    full_name: model.text(),
    phone: model.text().unique(),
    hub_id: model.text(),
    status: model.enum(["active", "inactive", "suspended"]).default("active"),
    pin_hash: model.text().nullable(),
    notes: model.text().nullable(),
  })
  .indexes([{ on: ["hub_id"], where: "deleted_at IS NULL" }])

export default Rider
