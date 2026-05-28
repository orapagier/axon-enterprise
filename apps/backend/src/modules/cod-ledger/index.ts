import CodLedgerModuleService from "./service"
import { Module } from "@medusajs/framework/utils"

export const COD_LEDGER_MODULE = "cod_ledger"

export default Module(COD_LEDGER_MODULE, {
  service: CodLedgerModuleService,
})
