import { defineLink } from "@medusajs/framework/utils"
import OrderModule from "@medusajs/medusa/order"
import CodLedgerModule from "../modules/cod-ledger"

export default defineLink(
  OrderModule.linkable.order,
  CodLedgerModule.linkable.codTransaction
)
