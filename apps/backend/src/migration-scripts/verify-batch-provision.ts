/**
 * Runtime-verification harness for the 2026-06-13 batch + stackable roles.
 * Reports live data state (proves migrations applied + modules registered) and
 * provisions throwaway fixtures used by the HTTP driver, then cleans up when
 * run with VERIFY_CLEANUP=1.
 *
 *   npx medusa exec ./src/migration-scripts/verify-batch-provision.ts
 *   VERIFY_CLEANUP=1 npx medusa exec ./src/migration-scripts/verify-batch-provision.ts
 *
 * Throwaway admin:  verify-bot@mfh.local / Verify-Bot-2026!
 * Membership fixtures: vrenew-approve@mfh.local, vrenew-reject@mfh.local
 */
import { ExecArgs } from "@medusajs/framework/types"
import { ContainerRegistrationKeys, Modules } from "@medusajs/framework/utils"
import { PRODUCER_PAYOUT_MODULE } from "../modules/producer-payout"
import { PUSH_NOTIFICATION_MODULE } from "../modules/push-notification"

const ADMIN_EMAIL = "verify-bot@mfh.local"
const ADMIN_PW = "Verify-Bot-2026!"
const RENEW_APPROVE = "vrenew-approve@mfh.local"
const RENEW_REJECT = "vrenew-reject@mfh.local"
const DAY = 24 * 60 * 60 * 1000

export default async function provision({ container }: ExecArgs) {
  const logger = container.resolve(ContainerRegistrationKeys.LOGGER)
  const query = container.resolve(ContainerRegistrationKeys.QUERY)
  const customerModule = container.resolve(Modules.CUSTOMER)
  const userModule = container.resolve(Modules.USER)
  const authModule = container.resolve(Modules.AUTH)
  const cleanup = process.env.VERIFY_CLEANUP === "1"

  // ---- module / migration presence (resolving them proves they're registered)
  const payoutSvc: any = container.resolve(PRODUCER_PAYOUT_MODULE)
  const pushSvc: any = container.resolve(PUSH_NOTIFICATION_MODULE)
  const payoutRows = await payoutSvc.listProducerPayouts({}, { take: 1000 })
  const pushRows = await pushSvc.listPushSubscriptions({}, { take: 1000 })

  if (cleanup) {
    // delete throwaway customers + their auth identities + throwaway admin
    for (const email of [RENEW_APPROVE, RENEW_REJECT]) {
      const [c] = await customerModule.listCustomers({ email }, { take: 1 })
      if (c) await customerModule.deleteCustomers([c.id])
    }
    // delete any verify-* customers created over HTTP
    const verifyCustomers = await customerModule.listCustomers(
      {},
      { take: 1000, select: ["id", "email"] }
    )
    const strays = verifyCustomers.filter((c: any) =>
      /^(vtrader|vpush|vrole)@mfh\.local$/.test(c.email ?? "")
    )
    if (strays.length) await customerModule.deleteCustomers(strays.map((c: any) => c.id))

    const users = await userModule.listUsers({ email: ADMIN_EMAIL })
    if (users.length) await userModule.deleteUsers([users[0].id])
    const ids = await authModule.listProviderIdentities({ provider: "emailpass" })
    const killEmails = new Set([
      ADMIN_EMAIL, RENEW_APPROVE, RENEW_REJECT,
      "vtrader@mfh.local", "vpush@mfh.local", "vrole@mfh.local",
    ])
    const killIds = ids.filter((i: any) => killEmails.has(i.entity_id)).map((i: any) => i.auth_identity_id)
    if (killIds.length) {
      for (const aid of killIds) {
        try { await authModule.deleteAuthIdentities([aid]) } catch {}
      }
    }
    // remove any leftover verify hub_intake payouts
    const strayPayouts = payoutRows.filter((p: any) =>
      (p.reference ?? "").startsWith("VERIFY-") || (p.notes ?? "").includes("verify-bot")
    )
    if (strayPayouts.length) await payoutSvc.deleteProducerPayouts(strayPayouts.map((p: any) => p.id))
    // remove any leftover verify push subs
    const strayPush = pushRows.filter((p: any) => (p.endpoint ?? "").includes("verify-bot"))
    if (strayPush.length) await pushSvc.deletePushSubscriptions(strayPush.map((p: any) => p.id))

    logger.info("VERIFY: cleanup done")
  }

  // ---- data state report
  const { data: products } = await query.graph({
    entity: "product",
    fields: ["id", "status"],
    pagination: { take: 1000 },
  })
  const liveProducts = products.filter((p: any) => p.status !== "draft")
  const { data: listings } = await query.graph({
    entity: "product_listing",
    fields: ["id", "status"],
    pagination: { take: 1000 },
  })
  const liveListings = listings.filter(
    (l: any) => !["cancelled", "expired"].includes(l.status)
  )
  const customers = await customerModule.listCustomers(
    {}, { take: 1000, select: ["id", "email", "metadata"] }
  )
  const { data: hubs } = await query.graph({
    entity: "hub",
    fields: ["id", "slug", "city", "active"],
    pagination: { take: 50 },
  })

  if (!cleanup) {
    // ---- ensure throwaway admin
    let [admin] = await userModule.listUsers({ email: ADMIN_EMAIL })
    if (!admin) admin = await userModule.createUsers({ email: ADMIN_EMAIL })
    const existingAuth = await authModule.listProviderIdentities({
      entity_id: ADMIN_EMAIL, provider: "emailpass",
    })
    if (!existingAuth.length) {
      const { authIdentity, success, error } = await authModule.register(
        "emailpass", { body: { email: ADMIN_EMAIL, password: ADMIN_PW } }
      )
      if (!success || !authIdentity) throw new Error(`admin register failed: ${JSON.stringify(error)}`)
      await authModule.updateAuthIdentities({
        id: authIdentity.id, app_metadata: { user_id: admin.id },
      })
    }

    // ---- membership precondition customers
    const now = Date.now()
    const setupMember = async (email: string) => {
      let [c] = await customerModule.listCustomers({ email }, { take: 1 })
      const meta = {
        membership_status: "active",
        membership_tier: "harvest-01",
        membership_joined_at: now - 100 * DAY,
        membership_expires_at: now + 30 * DAY, // 30 days remaining
        membership_renewal_pending: true,
        membership_payment_method: "gcash",
        membership_payment_reference: "VERIFY-RENEWAL-REF",
        roles: ["producer"],
      }
      if (c) {
        await customerModule.updateCustomers(c.id, { metadata: meta })
      } else {
        c = await customerModule.createCustomers({ email, metadata: meta })
      }
      return c
    }
    const ca = await setupMember(RENEW_APPROVE)
    const cr = await setupMember(RENEW_REJECT)

    logger.info("VERIFY_STATE " + JSON.stringify({
      modules: { producer_payout: true, push_notification: true },
      tables: { producer_payouts: payoutRows.length, push_subscriptions: pushRows.length },
      catalog: { live_products: liveProducts.length, live_listings: liveListings.length,
                 total_products: products.length, total_listings: listings.length },
      hubs: hubs.map((h: any) => ({ slug: h.slug, city: h.city, active: h.active })),
      customers: customers.map((c: any) => ({
        email: c.email,
        roles: (c.metadata as any)?.roles ?? null,
        account_type: (c.metadata as any)?.account_type ?? null,
        membership: (c.metadata as any)?.membership_status ?? null,
      })),
      fixtures: {
        admin: { email: ADMIN_EMAIL, id: admin.id },
        renew_approve: { email: RENEW_APPROVE, id: ca.id },
        renew_reject: { email: RENEW_REJECT, id: cr.id },
      },
    }))
  } else {
    logger.info("VERIFY_STATE " + JSON.stringify({
      catalog: { live_products: liveProducts.length, live_listings: liveListings.length },
      tables: { producer_payouts: payoutRows.length, push_subscriptions: pushRows.length },
    }))
  }
}
