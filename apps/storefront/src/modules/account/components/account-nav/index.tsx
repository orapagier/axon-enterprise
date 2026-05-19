"use client"

import { signout } from "@lib/data/customer"
import { HttpTypes } from "@medusajs/types"
import LocalizedClientLink from "@modules/common/components/localized-client-link"
import { useParams, usePathname } from "next/navigation"

type NavItem = {
  href: string
  label: string
  testId: string
  icon: React.ReactNode
}

const NAV_ITEMS: NavItem[] = [
  {
    href: "/account",
    label: "Overview",
    testId: "overview-link",
    icon: (
      <svg
        width="16"
        height="16"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <rect x="3" y="3" width="7" height="7" />
        <rect x="14" y="3" width="7" height="7" />
        <rect x="14" y="14" width="7" height="7" />
        <rect x="3" y="14" width="7" height="7" />
      </svg>
    ),
  },
  {
    href: "/account/profile",
    label: "Profile",
    testId: "profile-link",
    icon: (
      <svg
        width="16"
        height="16"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
        <circle cx="12" cy="7" r="4" />
      </svg>
    ),
  },
  {
    href: "/account/addresses",
    label: "Addresses",
    testId: "addresses-link",
    icon: (
      <svg
        width="16"
        height="16"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
        <circle cx="12" cy="10" r="3" />
      </svg>
    ),
  },
  {
    href: "/account/orders",
    label: "Orders",
    testId: "orders-link",
    icon: (
      <svg
        width="16"
        height="16"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M16.5 9.4 7.55 4.24" />
        <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
        <polyline points="3.27 6.96 12 12.01 20.73 6.96" />
        <line x1="12" y1="22.08" x2="12" y2="12" />
      </svg>
    ),
  },
  {
    href: "/account/membership",
    label: "Membership",
    testId: "membership-link",
    icon: (
      <svg
        width="16"
        height="16"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
      </svg>
    ),
  },
]

const SELLER_NAV_ITEM: NavItem = {
  href: "/account/seller",
  label: "My Listings",
  testId: "seller-link",
  icon: (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M2 7l10 5 10-5-10-5-10 5z" />
      <path d="M2 17l10 5 10-5" />
      <path d="M2 12l10 5 10-5" />
    </svg>
  ),
}

const AccountNav = ({
  customer,
}: {
  customer: HttpTypes.StoreCustomer | null
}) => {
  const route = usePathname() ?? ""
  const { countryCode } = useParams() as { countryCode: string }

  const isSeller =
    (customer?.metadata as Record<string, unknown> | null)?.account_type ===
    "seller"

  const navItems = isSeller
    ? [NAV_ITEMS[0], SELLER_NAV_ITEM, ...NAV_ITEMS.slice(1)]
    : NAV_ITEMS

  const handleLogout = async () => {
    await signout(countryCode)
  }

  const isActive = (href: string) => {
    const stripped = route.split(countryCode)[1] ?? ""
    if (href === "/account") return stripped === "/account"
    return stripped.startsWith(href)
  }

  return (
    <nav data-testid="account-nav">
      <div className="bg-white rounded-2xl shadow-soft border border-grey-10/60 p-3 small:sticky small:top-26">
        <ul className="flex flex-col gap-y-0.5">
          {navItems.map((item) => {
            const active = isActive(item.href)
            return (
              <li key={item.href}>
                <LocalizedClientLink
                  href={item.href}
                  data-testid={item.testId}
                  className={`flex items-center gap-x-3 px-3.5 py-2.5 rounded-xl text-body-sm font-medium transition-all duration-150 ${
                    active
                      ? "bg-brand-green-50 text-brand-green-700"
                      : "text-grey-70 hover:text-grey-90 hover:bg-grey-5"
                  }`}
                >
                  <span
                    className={
                      active ? "text-brand-green-600" : "text-grey-50"
                    }
                  >
                    {item.icon}
                  </span>
                  <span>{item.label}</span>
                  {active && (
                    <span className="ml-auto w-1.5 h-1.5 rounded-full bg-brand-green-500" />
                  )}
                </LocalizedClientLink>
              </li>
            )
          })}
        </ul>

        <div className="h-px bg-grey-10 my-2" />

        <button
          type="button"
          onClick={handleLogout}
          data-testid="logout-button"
          className="w-full flex items-center gap-x-3 px-3.5 py-2.5 rounded-xl text-body-sm font-medium text-grey-60 hover:text-red-600 hover:bg-red-50 transition-colors"
        >
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
            <polyline points="16 17 21 12 16 7" />
            <line x1="21" y1="12" x2="9" y2="12" />
          </svg>
          Log out
        </button>
      </div>
    </nav>
  )
}

export default AccountNav
