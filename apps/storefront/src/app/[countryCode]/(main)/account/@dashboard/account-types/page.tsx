import { retrieveCustomer } from "@lib/data/customer"
import { getRiderSession } from "@lib/data/rider"
import { rolesOf } from "@lib/util/roles"
import AccountTypesPanel from "@modules/account/components/account-types"
import { Metadata } from "next"
import { redirect } from "next/navigation"

export const metadata: Metadata = {
  title: "Account types | Mindanao Fresh Hub",
  description:
    "Add Producer, Trader or Rider capabilities to your FreshHub account.",
}

// Role/membership state must reflect admin actions immediately.
export const dynamic = "force-dynamic"

type Props = {
  params: Promise<{ countryCode: string }>
}

export default async function AccountTypesPage({ params }: Props) {
  const { countryCode } = await params
  const customer = await retrieveCustomer()

  if (!customer) {
    redirect(`/${countryCode}/account`)
  }

  const meta = (customer.metadata ?? {}) as Record<string, unknown>
  const roles = rolesOf(meta)

  // Rider state comes from the rider record (matched on email), so it stays
  // correct even for riders registered by the hub admin before the roles model.
  const session = await getRiderSession()

  const num = (v: unknown) =>
    typeof v === "number" && Number.isFinite(v) ? v : null

  return (
    <AccountTypesPanel
      roles={roles}
      membershipStatus={
        typeof meta.membership_status === "string"
          ? meta.membership_status
          : null
      }
      membershipExpiresAt={num(meta.membership_expires_at)}
      membershipGraceUntil={num(meta.membership_grace_until)}
      traderApproved={meta.trader_approved === true}
      traderDiscountPercent={num(meta.trader_discount_percent)}
      riderStatus={session.rider?.status ?? null}
    />
  )
}
