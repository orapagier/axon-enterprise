"use client"

import { useEffect, useState } from "react"
import { sdk } from "@lib/config"

type WalletStatus = "none" | "pending_verification" | "verified"

type Wallet = {
  customer_id: string
  status: WalletStatus
  deposit_balance: number
  payment_reference: string | null
  verified_at: string | null
}

/**
 * Account-page widget showing the customer's COD deposit status.
 *
 * - verified  → balance + verified date
 * - pending   → "We're reviewing your reference"
 * - none      → "Pay the ₱100 refundable deposit to enable COD at checkout"
 */
export default function DepositSection() {
  const [wallet, setWallet] = useState<Wallet | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let alive = true
    sdk.client
      .fetch<{ wallet: Wallet }>("/store/customer/deposit", { method: "GET" })
      .then((body) => {
        if (alive) setWallet(body.wallet)
      })
      .catch(() => {})
      .finally(() => {
        if (alive) setLoading(false)
      })
    return () => {
      alive = false
    }
  }, [])

  if (loading) {
    return (
      <p className="text-body-sm text-grey-50">Loading deposit status…</p>
    )
  }

  if (!wallet || wallet.status === "none") {
    return (
      <div className="flex flex-col gap-1">
        <span className="text-caption text-grey-50 uppercase tracking-[0.12em] font-semibold">
          COD deposit
        </span>
        <span className="text-body font-medium text-grey-90 mt-1">Not set up</span>
        <span className="text-caption text-grey-50 mt-0.5">
          Pay a one-time ₱100 refundable deposit at checkout to enable Cash on Delivery.
        </span>
      </div>
    )
  }

  if (wallet.status === "pending_verification") {
    return (
      <div className="flex flex-col gap-1">
        <span className="text-caption text-grey-50 uppercase tracking-[0.12em] font-semibold">
          COD deposit
        </span>
        <span className="text-body font-medium text-amber-700 mt-1">
          Pending verification
        </span>
        <span className="text-caption text-grey-50 mt-0.5">
          GCash ref{" "}
          <code className="font-mono">{wallet.payment_reference}</code>. Admin
          is reviewing.
        </span>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-1">
      <span className="text-caption text-grey-50 uppercase tracking-[0.12em] font-semibold">
        COD deposit
      </span>
      <span className="text-body font-medium text-green-700 mt-1">
        ₱{(wallet.deposit_balance / 100).toFixed(2)} refundable
      </span>
      {wallet.verified_at && (
        <span className="text-caption text-grey-50 mt-0.5">
          Verified{" "}
          {new Date(wallet.verified_at).toLocaleDateString("en-PH", {
            timeZone: "Asia/Manila",
            dateStyle: "medium",
          })}
        </span>
      )}
    </div>
  )
}
