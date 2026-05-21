import { defineLink } from "@medusajs/framework/utils"
import ListingModule from "../modules/listing"
import PickupModule from "../modules/pickup"

export default defineLink(
  ListingModule.linkable.productListing,
  PickupModule.linkable.pickupSlot
)