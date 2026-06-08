import { model } from "@medusajs/framework/utils"

const CodTransaction = model
  .define("cod_transaction", {
    id: model.id().primaryKey(),
    customer_id: model.text(),
    order_id: model.text().nullable(),
    type: model.enum(["cod_collected", "rider_remitted", "reconciled"]),
    amount: model.number(),
    reference: model.text().nullable(),
    rider_id: model.text().nullable(),
    recorded_by: model.text().nullable(),
    notes: model.text().nullable(),
  })
  .indexes([
    // Hot lookup paths: the idempotency check and reconciliation queries are
    // keyed on these columns.
    { on: ["order_id"], where: "deleted_at IS NULL" },
    { on: ["customer_id"], where: "deleted_at IS NULL" },
    // At most one ledger row of a given type per order. Makes cod-collected /
    // cod-remitted idempotent at the DB level (the route's read-then-insert
    // check otherwise races under concurrency).
    {
      on: ["order_id", "type"],
      unique: true,
      where: "order_id IS NOT NULL AND deleted_at IS NULL",
    },
  ])

export default CodTransaction
