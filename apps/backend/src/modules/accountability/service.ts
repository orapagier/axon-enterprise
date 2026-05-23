import { MedusaService } from "@medusajs/framework/utils"
import RefusalDispute from "./models/refusal-dispute"
import BuyerAccountStatus from "./models/buyer-account-status"

class AccountabilityModuleService extends MedusaService({
  RefusalDispute,
  BuyerAccountStatus,
}) {
  // Medusa's TS type generator leaves "Status" unchanged so it thinks the
  // method is `listBuyerAccountStatus`, but the runtime pluralizer adds
  // "es" so the real method is `listBuyerAccountStatuses`. Declare the
  // runtime names here so call sites compile without changing what the
  // runtime actually executes.
  declare listBuyerAccountStatuses: this["listBuyerAccountStatus"]
  declare listAndCountBuyerAccountStatuses: this["listAndCountBuyerAccountStatus"]
  declare createBuyerAccountStatuses: this["createBuyerAccountStatus"]
  declare updateBuyerAccountStatuses: this["updateBuyerAccountStatus"]
  declare deleteBuyerAccountStatuses: this["deleteBuyerAccountStatus"]
  declare softDeleteBuyerAccountStatuses: this["softDeleteBuyerAccountStatus"]
  declare restoreBuyerAccountStatuses: this["restoreBuyerAccountStatus"]
}

export default AccountabilityModuleService
