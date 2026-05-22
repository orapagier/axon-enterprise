import { defineLink } from "@medusajs/framework/utils"
import OrderModule from "@medusajs/medusa/order"
import DispatchModule from "../modules/dispatch"

export default defineLink(
  OrderModule.linkable.order,
  DispatchModule.linkable.dispatchOrder
)
