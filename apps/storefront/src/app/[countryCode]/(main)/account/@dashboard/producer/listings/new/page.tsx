import { retrieveCustomer } from "@lib/data/customer"
import { hasRole } from "@lib/util/roles"
import SellerListingForm from "@modules/account/components/seller-listing-form"
import { Metadata } from "next"
import { notFound, redirect } from "next/navigation"

export const metadata: Metadata = {
  title: "New listing | Mindanao Fresh Hub",
  description: "Add a new produce listing to the Mindanao Fresh Hub.",
}

type Props = { params: Promise<{ countryCode: string }> }

export default async function NewListingPage({ params }: Props) {
  const { countryCode } = await params
  const customer = await retrieveCustomer()
  if (!customer) redirect(`/${countryCode}/account`)

  const meta = (customer.metadata ?? {}) as Record<string, unknown>
  if (!hasRole(meta, "producer")) notFound()
  if (!meta.profile_completed) redirect(`/${countryCode}/onboarding`)

  return <SellerListingForm mode="create" />
}
