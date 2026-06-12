/**
 * Seeds customer.metadata.roles (stackable-roles reframe, 2026-06) from the
 * legacy single account_type. Consumer is the implied base, so consumer/buyer
 * accounts get an empty roles array; producer/seller, trader and rider each
 * get their one-role set.
 *
 * Idempotent: customers that already carry a roles array are skipped.
 *
 * Run with:
 *   npx medusa exec ./src/migration-scripts/migrate-roles.ts
 */
import { ExecArgs } from "@medusajs/framework/types"
import { Modules } from "@medusajs/framework/utils"
import { rolesOf } from "../lib/roles"

export default async function migrateRoles({ container }: ExecArgs) {
  const customerModule = container.resolve(Modules.CUSTOMER)

  const customers = await customerModule.listCustomers(
    {},
    { take: 1000, select: ["id", "email", "metadata"] }
  )

  let migrated = 0
  let skipped = 0

  for (const c of customers) {
    const meta = (c.metadata as Record<string, unknown> | null) ?? {}
    if (Array.isArray(meta.roles)) {
      skipped++
      continue
    }

    const roles = rolesOf(meta)
    await customerModule.updateCustomers(c.id, {
      metadata: {
        ...meta,
        roles,
        roles_migrated_at: new Date().toISOString(),
      },
    })
    console.log(`→ ${c.email}: roles=[${roles.join(", ")}]`)
    migrated++
  }

  console.log(`Done. ${migrated} migrated, ${skipped} already had roles.`)
}
