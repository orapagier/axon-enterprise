import { model } from "@medusajs/framework/utils"

const CodTransaction = model
  .define("cod_transaction", {
    id: model.id().primaryKey(),
    customer_id: model.text(),
    order_id: model.text().nullable(),
    // cod_collected   — rider took cash from buyer (rider-held until remitted)
    // rider_remitted  — rider handed cash to the hub
    // otc_collected   — buyer paid at the hub counter (hub-held; NO remittance leg)
    // reconciled      — end-of-day reconciliation marker
    type: model.enum([
      "cod_collected",
      "rider_remitted",
      "otc_collected",
      "reconciled",
    ]),
    amount: model.number(),
    // What SHOULD have been collected/remitted for this order (centavos):
    // order total + delivery fee on a cod_collected row, or the matching
    // collected amount on a rider_remitted row. Lets the aging report surface
    // shortfalls (collected/remitted < expected). Nullable: legacy rows and
    // otc/reconciled rows leave it unset.
    expected_amount: model.number().nullable(),
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
