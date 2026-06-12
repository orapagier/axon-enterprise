/**
 * Stackable account roles (2026-06 reframe) — storefront mirror of
 * apps/backend/src/lib/roles.ts. Keep the two in sync.
 *
 * Every customer is a Consumer. Producer, Trader and Rider are capabilities
 * stacked on top via `customer.metadata.roles` (string array); Producer and
 * Trader are mutually exclusive. Accounts created before the reframe carry a
 * single `account_type` instead and are treated as the equivalent one-role
 * set — but only until a `roles` array is written. Once `roles` exists it is
 * authoritative, so a downgrade can't be undone by the stale legacy field.
 */

export type StackableRole = "producer" | "trader" | "rider"
export type Role = "consumer" | StackableRole

export const STACKABLE_ROLES: StackableRole[] = ["producer", "trader", "rider"]

export const ROLE_LABELS: Record<Role, string> = {
  consumer: "Consumer",
  producer: "Producer",
  trader: "Trader",
  rider: "Rider",
}

export const ROLE_ICONS: Record<Role, string> = {
  consumer: "🧺",
  producer: "🌾",
  trader: "🤝",
  rider: "🛵",
}

// Pre-CPT naming, aliased the same way the rest of the app does.
const LEGACY_ALIASES: Record<string, string> = {
  seller: "producer",
  buyer: "consumer",
}

/** The customer's stacked roles ("consumer" is implied, never listed). */
export function rolesOf(
  meta: Record<string, unknown> | null | undefined
): StackableRole[] {
  if (!meta) return []
  if (Array.isArray(meta.roles)) {
    const present = meta.roles as unknown[]
    return STACKABLE_ROLES.filter((r) => present.includes(r))
  }
  const raw = typeof meta.account_type === "string" ? meta.account_type : ""
  const mapped = LEGACY_ALIASES[raw] ?? raw
  return STACKABLE_ROLES.filter((r) => r === mapped)
}

export function hasRole(
  meta: Record<string, unknown> | null | undefined,
  role: Role
): boolean {
  return role === "consumer" || rolesOf(meta).includes(role)
}
