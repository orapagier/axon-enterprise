import React from "react"

import AccountNav from "../components/account-nav"
import LocalizedClientLink from "@modules/common/components/localized-client-link"
import { HttpTypes } from "@medusajs/types"

interface AccountLayoutProps {
  customer: HttpTypes.StoreCustomer | null
  children: React.ReactNode
}

const AccountLayout: React.FC<AccountLayoutProps> = ({
  customer,
  children,
}) => {
  // When unauthenticated, render the login template full-bleed (it owns its own chrome).
  if (!customer) {
    return <div className="flex-1" data-testid="account-page">{children}</div>
  }

  // Read account type with legacy aliasing. Dev accounts created before the
  // CPT rename can still carry "buyer"/"seller" in metadata; treat those as
  // their new equivalents for display purposes.
  type RoleStored =
    | "consumer"
    | "producer"
    | "trader"
    | "buyer"
    | "seller"
    | "rider"
  const rawAccountType = customer.metadata?.account_type as
    | RoleStored
    | undefined
  const accountType: "consumer" | "producer" | "trader" | "rider" =
    rawAccountType === "seller"
      ? "producer"
      : rawAccountType === "buyer"
        ? "consumer"
        : (rawAccountType ?? "consumer")
  const profileCompleted = Boolean(customer.metadata?.profile_completed)
  const displayName =
    customer.first_name ||
    (customer.email ? customer.email.split("@")[0] : "there")

  const roleLabel = {
    consumer: "Consumer",
    producer: "Producer",
    trader: "Trader",
    rider: "Rider",
  }[accountType]
  const roleIcon = {
    consumer: "🧺",
    producer: "🌾",
    trader: "🤝",
    rider: "🛵",
  }[accountType]

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
                  {profileCompleted ? (
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
                  ) : (
                    <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-brand-gold-50 border border-brand-gold-200 text-[10px] font-bold text-brand-gold-800 uppercase tracking-wider">
                      Profile incomplete
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
