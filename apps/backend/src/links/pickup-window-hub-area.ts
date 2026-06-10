import { defineLink } from "@medusajs/framework/utils"
import HubModule from "../modules/hub"
import PickupModule from "../modules/pickup"

// A hub area hosts many pickup windows over time; each window has one area.
export default defineLink(
  HubModule.linkable.hubArea,
  { linkable: PickupModule.linkable.pickupWindow, isList: true }
)