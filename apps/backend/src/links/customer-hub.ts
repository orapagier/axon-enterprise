import { defineLink } from "@medusajs/framework/utils"
import CustomerModule from "@medusajs/medusa/customer"
import HubModule from "../modules/hub"

// Many customers share one home hub; each customer has exactly one hub.
// `isList` on the customer side is required: without it the link is 1:1 and
// the second customer ever to call POST /store/customers/me/hub gets
// "Cannot create multiple links between 'customer' and 'hub'".
export default defineLink(
  { linkable: CustomerModule.linkable.customer, isList: true },
  HubModule.linkable.hub
)