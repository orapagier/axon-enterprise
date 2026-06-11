"use client"

import { useParams } from "next/navigation"
import { useTransition } from "react"

import { signout } from "@lib/data/customer"
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

export default function AccountButton({
  isLoggedIn,
}: {
  isLoggedIn: boolean
}) {
  const params = useParams()
  const countryCode = (params?.countryCode as string) ?? "ph"
  const [pending, startTransition] = useTransition()

  const className =
    "hidden small:inline-flex items-center gap-x-1.5 h-9 px-3 rounded-full text-grey-60 hover:text-grey-90 hover:bg-grey-5 transition-all text-[12px] font-semibold"

  if (!isLoggedIn) {
    return (
      <LocalizedClientLink
        className={className}
        href="/account"
        data-testid="nav-account-link"
        aria-label="Sign in or sign up"
      >
        <UserIcon />
        <span>Signin/up</span>
      </LocalizedClientLink>
    )
  }

  return (
    <button
      type="button"
      className={`${className} disabled:opacity-60`}
      data-testid="nav-signout-button"
      aria-label="Sign out"
      disabled={pending}
      onClick={() => startTransition(() => signout(countryCode))}
    >
      <UserIcon />
      <span>Signout</span>
    </button>
  )
}
