import { Metadata } from "next"

import ProfilePhone from "@modules/account//components/profile-phone"
import ProfileBillingAddress from "@modules/account/components/profile-billing-address"
import ProfileEmail from "@modules/account/components/profile-email"
import ProfileName from "@modules/account/components/profile-name"
import { notFound } from "next/navigation"
import { listRegions } from "@lib/data/regions"
import { retrieveCustomer } from "@lib/data/customer"

export const metadata: Metadata = {
  title: "Profile",
  description: "View and edit your Mindanao Fresh Hub profile.",
}

export default async function Profile() {
  const customer = await retrieveCustomer()
  const regions = await listRegions()

  if (!customer || !regions) {
    notFound()
  }

  return (
    <div className="w-full" data-testid="profile-page-wrapper">
      {/* Heading */}
      <div className="mb-6">
        <h2 className="font-heading text-h1 text-grey-90 leading-tight">
          Profile
        </h2>
        <p className="text-body-sm text-grey-50 mt-1.5 leading-relaxed max-w-xl">
          Manage how you appear to sellers and how we reach you about orders.
        </p>
      </div>

      {/* Sections */}
      <div className="flex flex-col gap-y-4">
        <ProfileSection
          label="Personal"
          description="Your name and what we show on orders."
          icon="👤"
        >
          <ProfileName customer={customer} />
        </ProfileSection>

        <ProfileSection
          label="Contact"
          description="Where we send order updates and verification codes."
          icon="✉️"
        >
          <div className="flex flex-col gap-y-5">
            <ProfileEmail customer={customer} />
            <Divider />
            <ProfilePhone customer={customer} />
          </div>
        </ProfileSection>

        <ProfileSection
          label="Billing address"
          description="Used by default at checkout. You can override per-order."
          icon="📦"
        >
          <ProfileBillingAddress customer={customer} regions={regions} />
        </ProfileSection>
      </div>
    </div>
  )
}

const ProfileSection = ({
  label,
  description,
  icon,
  children,
}: {
  label: string
  description: string
  icon: string
  children: React.ReactNode
}) => (
  <section className="bg-white rounded-2xl shadow-soft border border-grey-10/60 overflow-hidden">
    <header className="px-6 small:px-7 py-5 border-b border-grey-10 flex items-start gap-x-4">
      <span className="w-10 h-10 rounded-xl bg-brand-green-50 border border-brand-green-100 text-brand-green-700 flex items-center justify-center text-lg shrink-0">
        {icon}
      </span>
      <div>
        <h3 className="font-heading text-h3 text-grey-90 leading-tight">
          {label}
        </h3>
        <p className="text-caption text-grey-50 mt-0.5">{description}</p>
      </div>
    </header>
    <div className="px-6 small:px-7 py-6">{children}</div>
  </section>
)

const Divider = () => <div className="h-px bg-grey-10" />
