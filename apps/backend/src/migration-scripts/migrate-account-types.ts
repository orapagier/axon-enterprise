/**
 * Migrates customer.metadata.account_type from the old "buyer"/"seller"
 * values to the new CPT naming ("consumer"/"producer"). Trader is new and
 * has no legacy equivalent to map.
 *
 * Idempotent: customers already on the new values are skipped.
 *
 * Run with:
 *   npx medusa exec ./src/migration-scripts/migrate-account-types.ts
 */
import { ExecArgs } from "@medusajs/framework/types"
import { Modules } from "@medusajs/framework/utils"

const LEGACY_TO_NEW: Record<string, string> = {
  buyer: "consumer",
  seller: "producer",
}

export default async function migrateAccountTypes({ container }: ExecArgs) {
  const customerModule = container.resolve(Modules.CUSTOMER)

  const customers = await customerModule.listCustomers(
    {},
    { take: 1000, select: ["id", "email", "metadata"] }
  )

  let migrated = 0
  let skipped = 0

  for (const c of customers) {
    const meta = (c.metadata as Record<string, unknown> | null) ?? {}
    const current = meta.account_type
    if (typeof current !== "string") continue

    const next = LEGACY_TO_NEW[current]
    if (!next) {
      skipped++
      continue
    }

    await customerModule.updateCustomers(c.id, {
      metadata: {
        ...meta,
        account_type: next,
        // Audit trail so we can spot-check which accounts got migrated.
        account_type_migrated_from: current,
        account_type_migrated_at: new Date().toISOString(),
      },
    })
    console.log(`→ ${c.email}: ${current} → ${next}`)
    migrated++
  }

  console.log(
    `Done. ${migrated} migrated, ${skipped} already on new naming or untyped.`
  )
}
