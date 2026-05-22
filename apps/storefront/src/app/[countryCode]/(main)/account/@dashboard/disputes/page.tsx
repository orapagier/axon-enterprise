import { Metadata } from "next"
import AccountStatusBanner from "@modules/account/components/account-status-banner"
import DisputesList from "@modules/account/components/disputes-list"

export const metadata: Metadata = {
  title: "Disputes",
  description: "Your refusal disputes and account accountability status.",
}

export default function DisputesPage() {
  return (
    <div className="w-full" data-testid="disputes-page-wrapper">
      <div className="mb-8 flex flex-col gap-y-4">
        <h1 className="text-2xl-semi">Disputes</h1>
        <p className="text-base-regular">
          If a delivery couldn&apos;t be completed, you have 48 hours to add
          your side of the story. Buyer-fault refusals affect your COD eligibility.
        </p>
      </div>
      <AccountStatusBanner />
      <DisputesList />
    </div>
  )
}
