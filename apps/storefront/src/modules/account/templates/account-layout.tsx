import React from "react"

import AccountNav from "../components/account-nav"
import LocalizedClientLink from "@modules/common/components/localized-client-link"
import { HttpTypes } from "@medusajs/types"
import { ROLE_ICONS, ROLE_LABELS, rolesOf } from "@lib/util/roles"

interface AccountLayoutProps {
  customer: HttpTypes.StoreCustomer | null
  // True when the customer has a stacked role (Producer/Trader/Rider) that the
  // team hasn't approved yet. Computed in the page layout because the rider's
  // status lives on the rider record, not customer metadata.
  awaitingVerification?: boolean
  children: React.ReactNode
}

const AccountLayout: React.FC<AccountLayoutProps> = ({
  customer,
  awaitingVerification = false,
  children,
}) => {
  // When unauthenticated, render the login template full-bleed (it owns its own chrome).
  if (!customer) {
    return <div className="flex-1" data-testid="account-page">{children}</div>
  }

  // Roles stack on the Consumer base, so the header lists every active role
  // (e.g. "Producer · Rider account"); plain consumers show "Consumer".
  const meta = (customer.metadata ?? {}) as Record<string, unknown>
  const roles = rolesOf(meta)
  const profileCompleted = Boolean(meta.profile_completed)
  // Sellers (Producer/Trader) finish their profile first, then wait for the
  // team to approve them (meta.seller_verified). A completed profile alone is
  // NOT "Verified" — that flag is set later in the admin Sellers page.
  const isSeller = roles.includes("producer") || roles.includes("trader")
  const awaitingVerification =
    profileCompleted && isSeller && meta.seller_verified !== true
  const displayName =
    customer.first_name ||
    (customer.email ? customer.email.split("@")[0] : "there")

  const roleLabel =
    roles.length > 0
      ? roles.map((r) => ROLE_LABELS[r]).join(" · ")
      : ROLE_LABELS.consumer
  const roleIcon = roles.length > 0 ? ROLE_ICONS[roles[0]] : ROLE_ICONS.consumer

  return (
    <div
      className="flex-1 bg-grey-5 min-h-[calc(100vh-100px)]"
      data-testid="account-page"
    >
      <div className="content-container pt-4 pb-8 small:pt-6 small:pb-12">
        {/* Header card */}
        <div className="bg-white rounded-2xl shadow-soft border border-grey-10/60 p-4 small:p-6 mb-4 small:mb-6">
          <div className="flex flex-col small:flex-row small:items-center small:justify-between gap-3 small:gap-4">
            <div className="flex items-center gap-x-3 small:gap-x-4">
              <div className="w-12 h-12 small:w-14 small:h-14 rounded-2xl bg-gradient-to-br from-brand-green-500 to-brand-green-700 text-white flex items-center justify-center text-xl small:text-2xl shrink-0">
                {roleIcon}
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-x-2 flex-wrap">
                  <span className="text-caption font-semibold text-grey-50 uppercase tracking-wider">
                    {roleLabel} account
                  </span>
                  {!profileCompleted ? (
                    <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-brand-gold-50 border border-brand-gold-200 text-[10px] font-bold text-brand-gold-800 uppercase tracking-wider">
                      Profile incomplete
                    </span>
                  ) : awaitingVerification ? (
                    <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-brand-gold-50 border border-brand-gold-200 text-[10px] font-bold text-brand-gold-800 uppercase tracking-wider">
                      Pending verification
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-x-1 px-2 py-0.5 rounded-full bg-brand-green-50 border border-brand-green-100 text-[10px] font-bold text-brand-green-700 uppercase tracking-wider">
                      <svg
                        width="9"
                        height="9"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="3.5"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        <polyline points="20 6 9 17 4 12" />
                      </svg>
                      Verified
                    </span>
                  )}
                </div>
                <h1
                  className="font-heading text-xl small:text-2xl text-grey-90 mt-0.5 truncate leading-tight"
                  data-testid="welcome-message"
                >
                  Hello, {displayName}
                </h1>
                <p className="text-caption text-grey-50 truncate">
                  {customer.email}
                </p>
              </div>
            </div>

            {!profileCompleted && (
              <LocalizedClientLink
                href="/onboarding"
                className="inline-flex items-center justify-center gap-x-1.5 px-4 py-2.5 rounded-xl bg-grey-90 hover:bg-brand-green-700 text-white text-body-sm font-semibold shadow-soft hover:shadow-medium transition-all whitespace-nowrap"
              >
                Complete profile
                <svg
                  width="14"
                  height="14"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <polyline points="9 18 15 12 9 6" />
                </svg>
              </LocalizedClientLink>
            )}
          </div>
        </div>

        {/* Main: sidebar + content */}
        <div className="grid grid-cols-1 small:grid-cols-[260px_1fr] gap-6">
          <AccountNav customer={customer} />
          <div className="min-w-0">{children}</div>
        </div>

        {/* Help footer */}
        <div className="mt-10 bg-white rounded-2xl border border-grey-10/60 px-6 small:px-8 py-6 flex flex-col small:flex-row small:items-center small:justify-between gap-4">
          <div>
            <h3 className="font-heading text-h3 text-grey-90">
              Need a hand?
            </h3>
            <p className="text-body-sm text-grey-50 mt-1">
              Our team is around 6 days a week to help with orders and listings.
            </p>
          </div>
          <LocalizedClientLink
            href="/customer-service"
            className="inline-flex items-center gap-x-1.5 px-4 py-2.5 rounded-xl border border-grey-20 bg-white text-body-sm font-medium text-grey-80 hover:border-brand-green-300 hover:text-brand-green-700 hover:bg-brand-green-50 transition-colors whitespace-nowrap self-start"
          >
            Contact support
            <svg
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <line x1="7" y1="17" x2="17" y2="7" />
              <polyline points="7 7 17 7 17 17" />
            </svg>
          </LocalizedClientLink>
        </div>
      </div>
    </div>
  )
}

export default AccountLayout
