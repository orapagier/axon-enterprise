import { defineLink } from "@medusajs/framework/utils"
import HubModule from "../modules/hub"
import DispatchModule from "../modules/dispatch"

export default defineLink(
  HubModule.linkable.hub,
  DispatchModule.linkable.dispatchBatch
)
