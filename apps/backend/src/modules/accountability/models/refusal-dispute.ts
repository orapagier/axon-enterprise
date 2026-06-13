import { model } from "@medusajs/framework/utils"

const RefusalDispute = model.define("refusal_dispute", {
  id: model.id().primaryKey(),
  order_id: model.text(),
  dispatch_order_id: model.text(),
  customer_id: model.text(),
  rider_id: model.text().nullable(),

  rider_photo_url: model.text().nullable(),
  rider_notes: model.text().nullable(),

  buyer_reason: model
    .enum(["damaged_goods", "wrong_item", "not_home", "other"])
    .nullable(),
  buyer_notes: model.text().nullable(),
  buyer_responded_at: model.dateTime().nullable(),

  producer_response: model.text().nullable(),
  producer_responded_at: model.dateTime().nullable(),

  // Phase G — SLA tracking (dispute-sla-tick job)
  buyer_reminder_sent_at: model.dateTime().nullable(),
  escalated_at: model.dateTime().nullable(),
  auto_resolved: model.boolean().default(false),

  resolution: model
    .enum([
      "pending",
      "buyer_fault",
      "producer_fault",
      "rider_fault",
      "platform_fault",
    ])
    .default("pending"),
  resolution_notes: model.text().nullable(),
  resolved_by: model.text().nullable(),
  resolved_at: model.dateTime().nullable(),

  // Phase G — appeal path (buyer contests a buyer_fault strike)
  appeal_state: model
    .enum(["none", "requested", "upheld", "overturned"])
    .default("none"),
  appeal_notes: model.text().nullable(),
  appeal_requested_at: model.dateTime().nullable(),
  appeal_resolved_at: model.dateTime().nullable(),
  appeal_resolved_by: model.text().nullable(),
})

export default RefusalDispute
