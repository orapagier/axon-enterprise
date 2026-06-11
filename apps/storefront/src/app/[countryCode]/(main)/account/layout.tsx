import { Metadata } from "next"

import { retrieveCustomer } from "@lib/data/customer"
// TODO: Re-add Toaster component when needed
import AccountLayout from "@modules/account/templates/account-layout"

// The root layout's title.template does not propagate into parallel route
// slots (@dashboard / @login), so it is re-declared at this segment.
export const metadata: Metadata = {
  title: {
    template: "%s | Mindanao Fresh Hub",
    default: "Account | Mindanao Fresh Hub",
  },
}

export default async function AccountPageLayout({
  dashboard,
  login,
}: {
  dashboard?: React.ReactNode
  login?: React.ReactNode
}) {
  const customer = await retrieveCustomer().catch(() => null)

  return (
    <AccountLayout customer={customer}>
      {customer ? dashboard : login}
      {/* TODO: Re-add Toaster component when needed */}
    </AccountLayout>
  )
}
