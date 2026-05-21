import { defineLink } from "@medusajs/framework/utils"
import CustomerModule from "@medusajs/medusa/customer"
import HubModule from "../modules/hub"

export default defineLink(
  CustomerModule.linkable.customer,
  HubModule.linkable.hub
)