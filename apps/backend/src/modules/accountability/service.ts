import { MedusaService } from "@medusajs/framework/utils"
import RefusalDispute from "./models/refusal-dispute"
import BuyerAccountStatus from "./models/buyer-account-status"

class AccountabilityModuleService extends MedusaService({
  RefusalDispute,
  BuyerAccountStatus,
}) {}

export default AccountabilityModuleService
