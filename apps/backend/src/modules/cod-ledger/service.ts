import { MedusaService } from "@medusajs/framework/utils"
import CodTransaction from "./models/cod-transaction"

class CodLedgerModuleService extends MedusaService({
  CodTransaction,
}) {}

export default CodLedgerModuleService
