import { MedusaService } from "@medusajs/framework/utils"
import BuyerWallet from "./models/buyer-wallet"
import CodTransaction from "./models/cod-transaction"

class CodLedgerModuleService extends MedusaService({
  BuyerWallet,
  CodTransaction,
}) {}

export default CodLedgerModuleService
