import AccountabilityModuleService from "./service"
import { Module } from "@medusajs/framework/utils"

export const ACCOUNTABILITY_MODULE = "accountability"

/**
 * Buyer-side state names that block COD checkout. The COD payment provider
 * imports this set to gate authorizePayment.
 */
export const PREPAY_LOCKED_STATES = new Set([
  "prepay_locked_30d",
  "prepay_locked_permanent",
])

export default Module(ACCOUNTABILITY_MODULE, {
  service: AccountabilityModuleService,
})
