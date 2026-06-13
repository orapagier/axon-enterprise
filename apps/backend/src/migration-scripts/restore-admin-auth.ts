/**
 * Restore the emailpass login for an existing admin user whose auth identity
 * was removed. (The 2026-06-13 full user purge deleted auth identities by
 * email; the admin user shares its email with a purged customer, so its
 * emailpass credential was collateral.) The `user` row is untouched — only the
 * auth identity is gone — so `medusa user` can't be used (its create-users step
 * trips the duplicate-email constraint). This re-registers emailpass and links
 * it back to the existing user id.
 *
 * Run with:
 *   RESTORE_ADMIN_EMAIL=you@example.com RESTORE_ADMIN_PW='<temp>' \
 *     npx medusa exec ./src/migration-scripts/restore-admin-auth.ts
 */
import { ExecArgs } from "@medusajs/framework/types"
import { Modules } from "@medusajs/framework/utils"

export default async function restoreAdminAuth({ container }: ExecArgs) {
  const email = (process.env.RESTORE_ADMIN_EMAIL ?? "").toLowerCase()
  const password = process.env.RESTORE_ADMIN_PW
  if (!email || !password) {
    throw new Error("Set RESTORE_ADMIN_EMAIL and RESTORE_ADMIN_PW env vars.")
  }

  const userModule = container.resolve(Modules.USER)
  const authModule = container.resolve(Modules.AUTH)

  const users = await userModule.listUsers({ email })
  if (!users.length) throw new Error(`No admin user with email ${email}.`)
  const user = users[0]

  const existing = await authModule.listProviderIdentities({
    entity_id: email,
    provider: "emailpass",
  })
  if (existing.length) {
    console.log(`emailpass identity already exists for ${email}; nothing to do.`)
    return
  }

  const { authIdentity, success, error } = await authModule.register(
    "emailpass",
    { body: { email, password } }
  )
  if (!success || !authIdentity) {
    throw new Error(`emailpass register failed: ${JSON.stringify(error)}`)
  }

  await authModule.updateAuthIdentities({
    id: authIdentity.id,
    app_metadata: { user_id: user.id },
  })

  console.log(`Restored emailpass login for ${email} -> user ${user.id}.`)
}
