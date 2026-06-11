import { Metadata } from "next"
import { notFound } from "next/navigation"

import AddressBook from "@modules/account/components/address-book"

import { getRegion } from "@lib/data/regions"
import { retrieveCustomer } from "@lib/data/customer"

export const metadata: Metadata = {
  title: "Addresses | Mindanao Fresh Hub",
  description: "View your addresses",
}

export default async function Addresses(props: {
  params: Promise<{ countryCode: string }>
}) {
  const params = await props.params
  const { countryCode } = params
  const customer = await retrieveCustomer()
  const region = await getRegion(countryCode)

  if (!customer || !region) {
    notFound()
  }

  return (
    <div
      className="flex w-full flex-col gap-y-6"
      data-testid="addresses-page-wrapper"
    >
      <div className="flex flex-col gap-y-1">
        <h1 className="font-heading text-h2 text-grey-90">
          Shipping addresses
        </h1>
        <p className="text-body-sm text-grey-50">
          Save the places you order to — they&apos;ll be ready to pick at
          checkout. Add as many as you like.
        </p>
      </div>
      <AddressBook customer={customer} region={region} />
    </div>
  )
}
