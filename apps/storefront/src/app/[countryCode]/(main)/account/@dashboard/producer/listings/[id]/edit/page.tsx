import { retrieveCustomer } from "@lib/data/customer"
import { getMyListing } from "@lib/data/seller"
import { hasRole } from "@lib/util/roles"
import SellerListingForm from "@modules/account/components/seller-listing-form"
import { Metadata } from "next"
import { notFound, redirect } from "next/navigation"

export const metadata: Metadata = {
  title: "Edit listing | Mindanao Fresh Hub",
}

type Props = { params: Promise<{ countryCode: string; id: string }> }

export default async function EditListingPage({ params }: Props) {
  const { countryCode, id } = await params
  const customer = await retrieveCustomer()
  if (!customer) redirect(`/${countryCode}/account`)

  const meta = (customer.metadata ?? {}) as Record<string, unknown>
  if (meta.account_type !== "producer" && meta.account_type !== "seller") notFound()
  if (!meta.profile_completed) redirect(`/${countryCode}/onboarding`)

  const listing = await getMyListing(id)
  if (!listing) notFound()

  return <SellerListingForm mode="edit" existing={listing} />
}
