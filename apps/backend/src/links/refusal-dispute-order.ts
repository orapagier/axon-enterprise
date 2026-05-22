import { defineLink } from "@medusajs/framework/utils"
import OrderModule from "@medusajs/medusa/order"
import AccountabilityModule from "../modules/accountability"

export default defineLink(
  OrderModule.linkable.order,
  AccountabilityModule.linkable.refusalDispute
)
