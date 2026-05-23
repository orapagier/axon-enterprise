"use client"

import React from "react"
import { HttpTypes } from "@medusajs/types"

type MyInformationProps = {
  customer: HttpTypes.StoreCustomer
}

// Self-service password change isn't wired to the Medusa auth provider yet,
// and the transactional email flow needed for a reset link is also pending.
// Render this section as informational only instead of showing a form whose
// submit silently no-ops.
const ProfilePassword: React.FC<MyInformationProps> = ({
  customer: _customer,
}) => {
  return (
    <div className="w-full" data-testid="account-password-display">
      <div className="flex flex-col">
        <span className="uppercase text-ui-fg-base text-small-regular">
          Password
        </span>
        <span className="text-ui-fg-subtle text-large-regular">
          ••••••••
        </span>
        <span className="text-ui-fg-muted text-xsmall-regular mt-1">
          Password changes aren't available from the storefront yet. Contact
          support to reset your password.
        </span>
      </div>
    </div>
  )
}

export default ProfilePassword
