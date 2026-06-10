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

/**
 * How long a "warned" buyer must stay clean before recovering to "normal".
 * The escalation workflow stamps `recovery_eligible_at = strike + window`;
 * the clean-order-tick job recovers a warned buyer once that moment passes
 * AND they have placed a clean (delivered) order since the strike.
 */
export const WARNED_RECOVERY_WINDOW_MS = 180 * 24 * 60 * 60 * 1000

export default Module(ACCOUNTABILITY_MODULE, {
  service: AccountabilityModuleService,
})
