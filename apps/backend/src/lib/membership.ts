import { ContainerRegistrationKeys } from "@medusajs/framework/utils"
import type { MedusaContainer } from "@medusajs/framework/types"

/**
 * The admin-managed customer group that confers Hub Member status. Membership
 * perks and member pricing are both scoped to this group; the admin approval
 * flow (`/admin/memberships/[id]`) is the only thing that adds/removes a
 * customer here.
 */
export const HUB_MEMBER_GROUP = "hub-members"

/**
 * Authoritative Hub-Member check.
 *
 * Perk gates (Special / within-the-hour delivery) MUST key off this
 * admin-controlled group, never off `customer.metadata`: Medusa's
 * `POST /store/customers/me` accepts arbitrary metadata, so a buyer could
 * self-set `membership_status: "active"` and unlock paid perks for free.
 * Group membership can only be granted by an admin, so it can't be forged.
 */
export async function isHubMember(
  container: MedusaContainer,
  customerId: string | null | undefined
): Promise<boolean> {
  if (!customerId) return false
  const query = container.resolve(ContainerRegistrationKeys.QUERY)
  const { data } = await query.graph({
    entity: "customer",
    fields: ["id", "groups.name"],
    filters: { id: customerId },
  })
  const groups = (data[0]?.groups ?? []) as { name?: string }[]
  return groups.some((g) => g?.name === HUB_MEMBER_GROUP)
}
