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

/**
 * Phase G — dispute SLA & appeal windows.
 *
 * - RESPONSE_SLA: the buyer/seller have this long after a refusal to add their
 *   side (the respond routes reject late responses with the same window).
 * - REMINDER_AFTER: the SLA job nudges a silent buyer once this much has passed.
 * - APPEAL_WINDOW: how long after a buyer_fault resolution the buyer may appeal.
 */
export const DISPUTE_RESPONSE_SLA_MS = 48 * 60 * 60 * 1000
export const DISPUTE_REMINDER_AFTER_MS = 24 * 60 * 60 * 1000
export const DISPUTE_APPEAL_WINDOW_MS = 14 * 24 * 60 * 60 * 1000

/**
 * Founder call (2026-06-14): a buyer who ignores a dispute past the SLA is
 * *flagged for admin review*, NOT auto-struck — a human always makes the call.
 * The SLA job already implements the auto-resolve-as-buyer_fault branch; flip
 * this to `true` to enable it (the "silence = forfeit" policy the founder may
 * adopt later). Kept off so no strike is ever applied without admin action.
 */
export const DISPUTE_NO_RESPONSE_AUTO_RESOLVE = false

export default Module(ACCOUNTABILITY_MODULE, {
  service: AccountabilityModuleService,
})
