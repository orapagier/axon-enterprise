"use client"

import {
  Popover,
  PopoverButton,
  PopoverPanel,
  Transition,
} from "@headlessui/react"
import { useParams } from "next/navigation"
import { Fragment, useEffect, useRef, useState, useTransition } from "react"

import { signout } from "@lib/data/customer"
import type { StackableRole } from "@lib/util/roles"
import LocalizedClientLink from "@modules/common/components/localized-client-link"

const UserIcon = () => (
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
)

type MenuLink = {
  href: string
  label: string
  testId: string
  icon: React.ReactNode
}

const MENU_LINKS: MenuLink[] = [
  {
    href: "/account",
    label: "Overview",
    testId: "nav-overview-link",
    icon: (
      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
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
    testId: "nav-profile-link",
    icon: (
      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
        <circle cx="12" cy="7" r="4" />
      </svg>
    ),
  },
  {
    href: "/account/orders",
    label: "Orders",
    testId: "nav-orders-link",
    icon: (
      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M16.5 9.4 7.55 4.24" />
        <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
        <polyline points="3.27 6.96 12 12.01 20.73 6.96" />
        <line x1="12" y1="22.08" x2="12" y2="12" />
      </svg>
    ),
  },
  {
    href: "/account/addresses",
    label: "Addresses",
    testId: "nav-addresses-link",
    icon: (
      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
        <circle cx="12" cy="10" r="3" />
      </svg>
    ),
  },
  {
    href: "/account/membership",
    label: "Membership",
    testId: "nav-membership-link",
    icon: (
      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
      </svg>
    ),
  },
]

const PRODUCER_LINK: MenuLink = {
  href: "/account/producer",
  label: "My Listings",
  testId: "nav-producer-link",
  icon: (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M2 7l10 5 10-5-10-5-10 5z" />
      <path d="M2 17l10 5 10-5" />
      <path d="M2 12l10 5 10-5" />
    </svg>
  ),
}

const RIDER_LINK: MenuLink = {
  href: "/account/rider",
  label: "Deliveries",
  testId: "nav-rider-link",
  icon: (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="1" y="3" width="15" height="13" />
      <polygon points="16 8 20 8 23 11 23 16 16 16 16 8" />
      <circle cx="5.5" cy="18.5" r="2.5" />
      <circle cx="18.5" cy="18.5" r="2.5" />
    </svg>
  ),
}

export default function AccountButton({
  isLoggedIn,
  roles = [],
}: {
  isLoggedIn: boolean
  roles?: StackableRole[]
}) {
  const params = useParams()
  const countryCode = (params?.countryCode as string) ?? "ph"
  const [pending, startTransition] = useTransition()

  const triggerClassName =
    "inline-flex items-center gap-x-1.5 h-9 px-2.5 small:px-3 rounded-full text-grey-60 hover:text-grey-90 hover:bg-grey-5 transition-all text-[12px] font-semibold"

  if (!isLoggedIn) {
    return (
      <LocalizedClientLink
        className={triggerClassName}
        href="/account"
        data-testid="nav-account-link"
        aria-label="Sign in or sign up"
      >
        <UserIcon />
        <span className="hidden small:inline">Signin/up</span>
      </LocalizedClientLink>
    )
  }

  // Mirrors account-nav: roles stack, so a producer-rider gets both the
  // listings entry and the run sheet.
  const links = [
    MENU_LINKS[0],
    ...(roles.includes("producer") ? [PRODUCER_LINK] : []),
    ...(roles.includes("rider") ? [RIDER_LINK] : []),
    ...MENU_LINKS.slice(1),
  ]

  return (
    <Menu as="div" className="relative">
      <MenuButton
        className={`${triggerClassName} data-[open]:text-grey-90 data-[open]:bg-grey-5`}
        data-testid="nav-account-button"
        aria-label="Account menu"
      >
        <UserIcon />
        <span className="hidden small:inline">Account</span>
        <svg
          width="10"
          height="10"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </MenuButton>
      <Transition
        as={Fragment}
        enter="transition ease-out duration-200"
        enterFrom="opacity-0 translate-y-1"
        enterTo="opacity-100 translate-y-0"
        leave="transition ease-in duration-150"
        leaveFrom="opacity-100 translate-y-0"
        leaveTo="opacity-0 translate-y-1"
      >
        <MenuItems
          className="absolute top-[calc(100%+8px)] right-0 z-50 w-56 bg-white rounded-2xl shadow-large border border-grey-10 p-2 focus:outline-none"
          data-testid="nav-account-dropdown"
        >
          {links.map((link) => (
            <MenuItem key={link.href}>
              <LocalizedClientLink
                href={link.href}
                data-testid={link.testId}
                className="flex items-center gap-x-3 px-3 py-2 rounded-xl text-body-sm font-medium text-grey-70 data-[focus]:text-grey-90 data-[focus]:bg-grey-5 transition-colors"
              >
                <span className="text-grey-50">{link.icon}</span>
                <span>{link.label}</span>
              </LocalizedClientLink>
            </MenuItem>
          ))}

          <div className="h-px bg-grey-10 my-1.5 mx-1" />

          <MenuItem>
            <button
              type="button"
              data-testid="nav-signout-button"
              disabled={pending}
              onClick={() => startTransition(() => signout(countryCode))}
              className="w-full flex items-center gap-x-3 px-3 py-2 rounded-xl text-body-sm font-medium text-grey-60 data-[focus]:text-red-600 data-[focus]:bg-red-50 transition-colors disabled:opacity-60"
            >
              <svg
                width="15"
                height="15"
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
              <span>{pending ? "Signing out…" : "Log out"}</span>
            </button>
          </MenuItem>
        </MenuItems>
      </Transition>
    </Menu>
  )
}
