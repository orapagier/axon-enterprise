import { defineLink } from "@medusajs/framework/utils"
import HubModule from "../modules/hub"
import PickupModule from "../modules/pickup"

export default defineLink(
  HubModule.linkable.hubArea,
  PickupModule.linkable.pickupWindow
)