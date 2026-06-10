import { defineLink } from "@medusajs/framework/utils"
import HubModule from "../modules/hub"
import DispatchModule from "../modules/dispatch"

// A hub runs many dispatch batches (one per day); each batch belongs to one hub.
export default defineLink(
  HubModule.linkable.hub,
  { linkable: DispatchModule.linkable.dispatchBatch, isList: true }
)
