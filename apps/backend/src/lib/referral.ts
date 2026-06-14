/**
 * Referral bonus economics, shared by the reward grant (membership approval)
 * and any reporting. A referrer earns a percentage of the annual membership fee
 * as store credit when a customer they referred upgrades to premium for the
 * first time. Direct (1st-level) referrals only.
 *
 * The storefront mirrors the fee as MEMBERSHIP_FEE_PHP in
 * apps/storefront/src/lib/util/membership.ts — keep the two in sync.
 */
export const MEMBERSHIP_FEE_PHP = 500
export const REFERRAL_BONUS_RATE = 0.1

/** Bonus in centavos (the unit Medusa promotions + our ledgers use). */
export const REFERRAL_BONUS_CENTAVOS = Math.round(
  MEMBERSHIP_FEE_PHP * 100 * REFERRAL_BONUS_RATE
)

/** Bonus in whole pesos, for display/copy. */
export const REFERRAL_BONUS_PHP = REFERRAL_BONUS_CENTAVOS / 100
