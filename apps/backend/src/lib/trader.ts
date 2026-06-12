import type { MedusaContainer } from "@medusajs/framework/types"
import { Modules } from "@medusajs/framework/utils"
import { createPromotionsWorkflow } from "@medusajs/medusa/core-flows"
import { hasRole } from "./roles"

/**
 * Phase D — trader (B2B) pricing primitives.
 *
 * A trader's negotiated discount is a percentage tier. Each tier is backed by:
 *   - a customer group  `traders-<pct>`  (e.g. traders-10), and
 *   - an automatic, active promotion `TRADER-<pct>` (<pct>% off the order)
 *     whose rule targets that group (`customer.groups.id in [group]`).
 *
 * Medusa applies automatic promotions during cart operations, so an approved
 * trader sees the discount on every cart with no code entry — and nobody else
 * does. Price lists were the wrong primitive here (they are absolute amount
 * overrides per variant, not percentages).
 *
 * Tiers are created lazily on first approval and shared by every trader on the
 * same percentage. Customer metadata (`trader_approved`,
 * `trader_discount_percent`, …) stays the source of truth, mirroring how
 * membership works.
 */

export const TRADER_GROUP_PREFIX = "traders-"
export const TRADER_PROMO_PREFIX = "TRADER-"

export function isValidTraderDiscount(pct: unknown): pct is number {
  return (
    typeof pct === "number" &&
    Number.isInteger(pct) &&
    pct >= 1 &&
    pct <= 90
  )
}

export function isTraderAccount(meta: Record<string, unknown>): boolean {
  return meta.account_type === "trader"
}

/**
 * Ensure the customer group + automatic promotion for a discount tier exist.
 * Idempotent: both are looked up by their deterministic names first.
 * Returns the group id.
 */
export async function ensureTraderTier(
  container: MedusaContainer,
  pct: number
): Promise<string> {
  const customerModule = container.resolve(Modules.CUSTOMER)
  const promotionModule = container.resolve(Modules.PROMOTION)

  const groupName = `${TRADER_GROUP_PREFIX}${pct}`
  let [group] = await customerModule.listCustomerGroups(
    { name: groupName },
    { take: 1 }
  )
  if (!group) {
    group = await customerModule.createCustomerGroups({
      name: groupName,
      metadata: {
        source: "trader-tier-auto-created",
        purpose: `Approved traders with a negotiated ${pct}% discount. The automatic ${TRADER_PROMO_PREFIX}${pct} promotion targets this group.`,
      },
    })
  }

  const code = `${TRADER_PROMO_PREFIX}${pct}`
  const [promotion] = await promotionModule.listPromotions(
    { code },
    { take: 1 }
  )
  if (!promotion) {
    await createPromotionsWorkflow(container).run({
      input: {
        promotionsData: [
          {
            code,
            type: "standard",
            status: "active",
            is_automatic: true,
            application_method: {
              type: "percentage",
              target_type: "order",
              value: pct,
            },
            rules: [
              {
                attribute: "customer.groups.id",
                operator: "in",
                values: [group.id],
              },
            ],
          },
        ],
      },
    })
  }

  return group.id
}

/**
 * Put the customer in exactly one (or zero) trader tier group. Removal from
 * stale tiers is best-effort per group — Medusa throws when removing a
 * non-member, which is the common case.
 */
export async function syncTraderGroupMembership(
  container: MedusaContainer,
  customerId: string,
  targetGroupId: string | null
): Promise<void> {
  const customerModule = container.resolve(Modules.CUSTOMER)

  const groups = await customerModule.listCustomerGroups({}, { take: 200 })
  for (const group of groups) {
    if (!group.name?.startsWith(TRADER_GROUP_PREFIX)) continue
    if (group.id === targetGroupId) continue
    try {
      await customerModule.removeCustomerFromGroup({
        customer_id: customerId,
        customer_group_id: group.id,
      })
    } catch {
      // not a member of this tier — fine
    }
  }

  if (targetGroupId) {
    await customerModule.addCustomerToGroup({
      customer_id: customerId,
      customer_group_id: targetGroupId,
    })
  }
}
