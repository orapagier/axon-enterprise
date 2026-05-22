import CodLedgerModuleService from "./service"
import { Module } from "@medusajs/framework/utils"

export const COD_LEDGER_MODULE = "cod_ledger"
export const DEPOSIT_AMOUNT_CENTAVOS = 10_000 // ₱100.00 refundable deposit

export default Module(COD_LEDGER_MODULE, {
  service: CodLedgerModuleService,
})
