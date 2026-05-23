"use client"

import React from "react"

import { HttpTypes } from "@medusajs/types"

type MyInformationProps = {
  customer: HttpTypes.StoreCustomer
}

// Medusa v2 binds the customer email to the auth identity; it cannot be
// self-updated from the storefront. Render it as read-only so users don't
// think changes will be saved.
const ProfileEmail: React.FC<MyInformationProps> = ({ customer }) => {
  return (
    <div
      className="w-full"
      data-testid="account-email-display"
    >
      <div className="flex flex-col">
        <span className="uppercase text-ui-fg-base text-small-regular">
          Email
        </span>
        <span className="text-ui-fg-subtle text-large-regular">
          {customer.email}
        </span>
        <span className="text-ui-fg-muted text-xsmall-regular mt-1">
          Email changes aren't available right now. Contact support if you
          need to update it.
        </span>
      </div>
    </div>
  )
}

export default ProfileEmail
