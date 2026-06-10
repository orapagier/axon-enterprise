import { defineLink } from "@medusajs/framework/utils"
import OrderModule from "@medusajs/medusa/order"
import CodLedgerModule from "../modules/cod-ledger"

// An order accrues multiple ledger rows (cod_collected + rider_remitted, ...);
// each transaction references one order.
export default defineLink(
  OrderModule.linkable.order,
  { linkable: CodLedgerModule.linkable.codTransaction, isList: true }
)
