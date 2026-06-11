import { Metadata } from "next"
import AccountStatusBanner from "@modules/account/components/account-status-banner"
import DisputesList from "@modules/account/components/disputes-list"
import { listCustomerDisputes } from "@lib/data/disputes"

export const metadata: Metadata = {
  title: "Disputes",
  description: "Your refusal disputes and account accountability status.",
}

// Disputes and accountability status must always be fresh.
export const dynamic = "force-dynamic"

export default async function DisputesPage() {
  const { disputes } = await listCustomerDisputes()

  return (
    <div
      className="w-full flex flex-col gap-y-4 small:gap-y-6"
      data-testid="disputes-page-wrapper"
    >
      <div className="bg-white rounded-3xl shadow-soft border border-grey-10/60 p-6 small:p-8">
        <span className="text-[10px] font-bold text-grey-50 uppercase tracking-[0.18em]">
          Accountability
        </span>
        <h1 className="font-heading font-bold text-h1 text-grey-90 mt-2 tracking-[-0.02em]">
          Disputes
        </h1>
        <p className="text-body-sm text-grey-50 mt-2 max-w-lg leading-relaxed">
          If a delivery couldn&apos;t be completed, you have 48 hours to add
          your side of the story. Buyer-fault refusals affect your COD
          eligibility.
        </p>
      </div>
      <AccountStatusBanner />
      <DisputesList disputes={disputes} />
    </div>
  )
}
