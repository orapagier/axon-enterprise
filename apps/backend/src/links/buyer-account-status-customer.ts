import { defineLink } from "@medusajs/framework/utils"
import CustomerModule from "@medusajs/medusa/customer"
import AccountabilityModule from "../modules/accountability"

export default defineLink(
  CustomerModule.linkable.customer,
  AccountabilityModule.linkable.buyerAccountStatus
)
