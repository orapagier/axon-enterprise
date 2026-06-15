import { retrieveCustomer } from "@lib/data/customer"
import { getRiderSession } from "@lib/data/rider"
import { rolesOf } from "@lib/util/roles"
// TODO: Re-add Toaster component when needed
import AccountLayout from "@modules/account/templates/account-layout"

/**
 * A stacked role only becomes "Verified" once the team approves it — each role
 * has its own approval flag:
 *   Producer → meta.seller_verified   Trader → meta.trader_approved
 *   Rider    → rider record status === "active" (lives on the rider table)
 * Until then the header shows "Pending verification" so it matches the
 * dashboards (e.g. the producer dashboard's "Pending review"). Returns false
 * for plain consumers, who need no verification.
 */
async function isAwaitingVerification(
  customer: Awaited<ReturnType<typeof retrieveCustomer>>
): Promise<boolean> {
  if (!customer) return false
  const meta = (customer.metadata ?? {}) as Record<string, unknown>
  if (!meta.profile_completed) return false
  const roles = rolesOf(meta)
  if (roles.length === 0) return false

  if (roles.includes("producer") && meta.seller_verified !== true) return true
  if (roles.includes("trader") && meta.trader_approved !== true) return true
  // Rider status isn't mirrored to metadata, so only pay for the fetch when the
  // customer actually carries the rider role.
  if (roles.includes("rider")) {
    const session = await getRiderSession()
    if (session.rider?.status !== "active") return true
  }
  return false
}

export default async function AccountPageLayout({
  dashboard,
  login,
}: {
  dashboard?: React.ReactNode
  login?: React.ReactNode
}) {
  const customer = await retrieveCustomer().catch(() => null)
  const awaitingVerification = await isAwaitingVerification(customer)

  return (
    <AccountLayout
      customer={customer}
      awaitingVerification={awaitingVerification}
    >
      {customer ? dashboard : login}
      {/* TODO: Re-add Toaster component when needed */}
    </AccountLayout>
  )
}
