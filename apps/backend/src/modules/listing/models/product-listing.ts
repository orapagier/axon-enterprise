import { model } from "@medusajs/framework/utils"

const ProductListing = model.define("product_listing", {
  id: model.id().primaryKey(),
  listing_type: model.enum(["direct_to_consumer", "sell_to_freshhub"]),
  harvest_date: model.dateTime().nullable(),
  pickup_window_id: model.text().nullable(),
  status: model
    .enum(["draft", "pending_pickup", "active", "sold_out", "expired", "cancelled"])
    .default("draft"),
})

export default ProductListing