import { retrieveCustomer } from "@lib/data/customer"
import { listMyListings } from "@lib/data/seller"
import SellerDashboard from "@modules/account/components/seller-dashboard"
import { Metadata } from "next"
import { notFound, redirect } from "next/navigation"

export const metadata: Metadata = {
  title: "Seller dashboard",
  description: "Manage your produce listings on Mindanao Fresh Hub.",
}

type Props = {
  params: Promise<{ countryCode: string }>
}

export default async function SellerDashboardPage({ params }: Props) {
  const { countryCode } = await params
  const customer = await retrieveCustomer()

  if (!customer) {
    redirect(`/${countryCode}/account`)
  }

  const meta = (customer.metadata ?? {}) as Record<string, unknown>
  if (meta.account_type !== "seller") {
    notFound()
  }

  const profileCompleted = Boolean(meta.profile_completed)
  if (!profileCompleted) {
    redirect(`/${countryCode}/onboarding`)
  }

  const isVerified = meta.seller_verified === true
  const businessName =
    (meta.business_name as string | undefined) ?? customer.company_name ?? undefined

  const result = await listMyListings()

  return (
    <div>
      <SellerDashboard
        listings={result.listings}
        isVerified={isVerified}
        businessName={businessName}
        errorCode={result.code}
        errorMessage={result.error}
      />
    </div>
  )
}
