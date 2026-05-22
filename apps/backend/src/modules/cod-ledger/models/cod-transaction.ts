import { model } from "@medusajs/framework/utils"

const CodTransaction = model.define("cod_transaction", {
  id: model.id().primaryKey(),
  customer_id: model.text(),
  order_id: model.text().nullable(),
  type: model.enum([
    "deposit_in",
    "deposit_refund",
    "deposit_forfeit",
    "cod_collected",
    "rider_remitted",
    "reconciled",
  ]),
  amount: model.number(),
  reference: model.text().nullable(),
  rider_id: model.text().nullable(),
  recorded_by: model.text().nullable(),
  notes: model.text().nullable(),
})

export default CodTransaction
