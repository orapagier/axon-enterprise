/**
 * Marks the customer with the given email as a verified seller.
 *
 * Usage:
 *   npx medusa exec ./src/migration-scripts/verify-seller.ts <email>
 *
 * If <email> is omitted, all customers with account_type=seller are
 * marked verified — handy during development.
 */
import { ExecArgs } from "@medusajs/framework/types"
import { Modules } from "@medusajs/framework/utils"

export default async function verifySeller({ container, args }: ExecArgs) {
  const customerModule = container.resolve(Modules.CUSTOMER)
  const requestedEmail = args?.[0]?.toLowerCase()

  const customers = await customerModule.listCustomers(
    requestedEmail ? { email: requestedEmail } : {},
    { take: 500 }
  )

  const targets = customers.filter((c) => {
    const t = (c.metadata as Record<string, unknown> | null)?.account_type
    return t === "producer" || t === "seller"
  })

  if (!targets.length) {
    console.log(
      requestedEmail
        ? `No seller customer found for ${requestedEmail}.`
        : "No seller customers found. Have any users signed up as sellers yet?"
    )
    return
  }

  for (const c of targets) {
    const meta = (c.metadata as Record<string, unknown> | null) ?? {}
    if (meta.seller_verified === true) {
      console.log(`✓ ${c.email} already verified, skipping.`)
      continue
    }
    await customerModule.updateCustomers(c.id, {
      metadata: {
        ...meta,
        seller_verified: true,
        seller_verified_at: new Date().toISOString(),
      },
    })
    console.log(`✅ Verified seller: ${c.email}`)
  }

  console.log(`Done. ${targets.length} seller(s) processed.`)
}
