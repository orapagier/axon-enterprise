"use client"

import { useEffect, useState } from "react"
import { sdk } from "@lib/config"

type State =
  | "normal"
  | "warned"
  | "prepay_locked_30d"
  | "prepay_locked_permanent"

type AccountStatus = {
  state: State
  state_until: string | null
  strike_count: number
} | null

/**
 * Status banner shown on the account overview when the customer is in a
 * non-normal accountability state (warned, prepay-locked).
 */
export default function AccountStatusBanner() {
  const [status, setStatus] = useState<AccountStatus>(null)

  useEffect(() => {
    let alive = true
    sdk.client
      .fetch<{ account_status: AccountStatus }>("/store/customer/disputes", {
        method: "GET",
      })
      .then((body) => {
        if (alive) setStatus(body.account_status ?? null)
      })
      .catch(() => {})
    return () => {
      alive = false
    }
  }, [])

  if (!status || status.state === "normal") return null

  const isPermanent = status.state === "prepay_locked_permanent"
  const isThirtyDay = status.state === "prepay_locked_30d"

  const tone = isPermanent
    ? "bg-red-50 border-red-200 text-red-900"
    : isThirtyDay
      ? "bg-amber-50 border-amber-200 text-amber-900"
      : "bg-amber-50 border-amber-200 text-amber-900"

  const title = isPermanent
    ? "Permanent prepay-only"
    : isThirtyDay
      ? "30-day prepay-only period"
      : "Warning issued"

  const detail = isPermanent
    ? "Your account is in a permanent prepay-only state. COD is not available; contact support to appeal."
    : isThirtyDay
      ? `COD is disabled until ${
          status.state_until
            ? new Date(status.state_until).toLocaleDateString("en-PH", {
                timeZone: "Asia/Manila",
                dateStyle: "medium",
              })
            : "the lock expires"
        }.`
      : "A refusal was charged to your account. Another refusal within 6 months triggers a 30-day prepay-only lock."

  return (
    <div className={`rounded-lg border ${tone} px-4 py-3 mb-4`}>
      <p className="font-medium text-sm">{title}</p>
      <p className="text-caption mt-1">{detail}</p>
      <p className="text-caption mt-1">
        Strikes on file: {status.strike_count}
      </p>
    </div>
  )
}
