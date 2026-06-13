import { model } from "@medusajs/framework/utils"

/**
 * A payout from the hub to a producer. Two kinds:
 *
 *   dtc_remit  — direct-to-consumer sale. The hub collected the buyer's cash
 *                (COD/OTC, existing rail), and now remits the producer's share
 *                (gross for their items minus the hub commission). One row per
 *                (order, producer); gated on the order's cash being settled.
 *   hub_intake — sell-to-FreshHub. The hub buys the produce at intake and pays
 *                the producer cash in person; this is the bookkeeping record of
 *                that cash handover (no order attached).
 *
 * Amounts are in centavos. `producer_id` is the producer's customer id;
 * `producer_name` is a display snapshot so history stays readable even if the
 * producer renames their business.
 */
const ProducerPayout = model
  .define("producer_payout", {
    id: model.id().primaryKey(),
    producer_id: model.text(),
    producer_name: model.text().nullable(),
    order_id: model.text().nullable(),
    kind: model.enum(["dtc_remit", "hub_intake"]),
    gross_centavos: model.bigNumber().nullable(),
    amount_centavos: model.bigNumber(),
    method: model.enum(["cash", "gcash"]).default("cash"),
    reference: model.text().nullable(),
    notes: model.text().nullable(),
    recorded_by: model.text().nullable(),
  })
  .indexes([{ on: ["producer_id"], where: "deleted_at IS NULL" }])

export default ProducerPayout
