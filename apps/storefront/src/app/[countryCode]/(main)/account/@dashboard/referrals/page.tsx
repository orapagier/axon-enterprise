import { Metadata } from "next"
import { notFound } from "next/navigation"
import { retrieveCustomer } from "@lib/data/customer"
import { getReferralPanel } from "@lib/data/referrals"
import ReferralPanelView from "@modules/account/components/referrals"

export const metadata: Metadata = {
  title: "Referrals | Mindanao Fresh Hub",
  description: "Invite friends to upgrade and earn store credit.",
}

export default async function ReferralsPage() {
  const customer = await retrieveCustomer()
  if (!customer) notFound()

  const panel = await getReferralPanel()

  return (
    <div className="w-full" data-testid="referrals-page-wrapper">
      <div className="mb-6">
        <h2 className="font-heading text-h1 text-grey-90 leading-tight">
          Referrals
        </h2>
        <p className="text-body-sm text-grey-50 mt-1.5 leading-relaxed max-w-xl">
          Share your code. When a friend upgrades to a Hub Member account, you
          earn{" "}
          <span className="font-semibold text-grey-90">
            ₱{panel.bonus_php} store credit
          </span>{" "}
          — usable on your next order.
        </p>
      </div>

      <ReferralPanelView panel={panel} />
    </div>
  )
}
