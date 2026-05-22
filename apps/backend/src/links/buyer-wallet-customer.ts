import { defineLink } from "@medusajs/framework/utils"
import CustomerModule from "@medusajs/medusa/customer"
import CodLedgerModule from "../modules/cod-ledger"

export default defineLink(
  CustomerModule.linkable.customer,
  CodLedgerModule.linkable.buyerWallet
)
