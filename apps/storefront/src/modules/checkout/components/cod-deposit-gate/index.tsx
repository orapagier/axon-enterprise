"use client"

import { useEffect, useState } from "react"
import { sdk } from "@lib/config"

export type CodWalletStatus = "none" | "pending_verification" | "verified"

type Wallet = {
  customer_id: string
  status: CodWalletStatus
  deposit_balance: number
  payment_reference: string | null
}

/**
 * COD deposit gate shown in the checkout payment step.
 *
 * - If the buyer's wallet is `verified` → green confirmation banner; COD can proceed.
 * - If `pending_verification` → "We received your reference, admin is reviewing." Checkout is blocked.
 * - If `none` → GCash QR + reference input. On submit, calls the deposit initiate endpoint.
 *
 * The deposit (₱100 refundable) is a one-time gate per buyer. After admin
 * verification the wallet stays verified for all future COD orders.
 *
 * `onStatusChange` reports the wallet's current status up to the parent so
 * the Continue button can be disabled until verification.
 */
export default function CodDepositGate({
  onStatusChange,
}: {
  onStatusChange?: (status: CodWalletStatus) => void
}) {
  const [wallet, setWallet] = useState<Wallet | null>(null)
  const [loading, setLoading] = useState(true)
  const [reference, setReference] = useState("")
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const load = async () => {
    setLoading(true)
    try {
      const body = await sdk.client.fetch<{ wallet: Wallet }>(
        "/store/customer/deposit",
        { method: "GET" }
      )
      setWallet(body.wallet)
      onStatusChange?.(body.wallet?.status ?? "none")
    } catch (e) {
      setError((e as Error).message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const onSubmit = async () => {
    if (!reference.trim()) {
      setError("GCash reference number is required.")
      return
    }
    setSubmitting(true)
    setError(null)
    try {
      const body = await sdk.client.fetch<{ wallet: Wallet }>(
        "/store/customer/deposit/initiate",
        {
          method: "POST",
          body: { reference: reference.trim() },
        }
      )
      setWallet(body.wallet)
      onStatusChange?.(body.wallet?.status ?? "pending_verification")
    } catch (e) {
      setError((e as Error).message)
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) {
    return (
      <div className="rounded-lg border border-grey-10 p-4 bg-grey-5">
        <p className="text-body-sm text-grey-50">Checking deposit status…</p>
      </div>
    )
  }

  if (wallet?.status === "verified") {
    return (
      <div className="rounded-lg border border-green-200 bg-green-50 p-4 flex items-center gap-3">
        <span className="text-green-700 text-lg">✓</span>
        <div>
          <p className="text-body-sm font-medium text-green-800">
            COD deposit verified
          </p>
          <p className="text-caption text-green-700">
            Balance: ₱{(wallet.deposit_balance / 100).toFixed(2)} refundable.
          </p>
        </div>
      </div>
    )
  }

  if (wallet?.status === "pending_verification") {
    return (
      <div className="rounded-lg border border-amber-200 bg-amber-50 p-4">
        <p className="text-body-sm font-medium text-amber-900 mb-1">
          Deposit pending verification
        </p>
        <p className="text-caption text-amber-800">
          We received your GCash reference{" "}
          <code className="font-mono">{wallet.payment_reference}</code>. An
          admin will verify within a few hours. You can complete checkout once
          the deposit is verified.
        </p>
      </div>
    )
  }

  // status === "none" → onboarding form
  return (
    <div className="rounded-lg border border-grey-10 p-4 bg-white">
      <h4 className="font-medium text-body mb-1">
        One-time ₱100 refundable COD deposit
      </h4>
      <p className="text-caption text-grey-50 mb-3">
        First-time COD buyers pay a ₱100 deposit via GCash. It&apos;s refunded
        after your first successful delivery, and unlocks COD for all future
        orders.
      </p>
      <div className="flex gap-4 items-start">
        <div className="w-32 h-32 flex items-center justify-center bg-grey-5 border border-dashed border-grey-20 rounded text-caption text-grey-50 text-center p-2">
          GCash QR
          <br />
          (admin will add)
        </div>
        <div className="flex-1">
          <label className="block text-caption font-medium text-grey-90 mb-1">
            GCash reference number
          </label>
          <input
            type="text"
            value={reference}
            onChange={(e) => setReference(e.target.value)}
            placeholder="e.g. 1234567890"
            className="w-full rounded border border-grey-20 px-3 py-2 text-body-sm"
            disabled={submitting}
          />
          {error && (
            <p className="text-caption text-red-600 mt-1">{error}</p>
          )}
          <button
            type="button"
            onClick={onSubmit}
            disabled={submitting || !reference.trim()}
            className="mt-3 inline-flex items-center px-4 py-2 rounded bg-grey-90 text-white text-body-sm font-medium disabled:opacity-50"
          >
            {submitting ? "Submitting…" : "Submit reference"}
          </button>
        </div>
      </div>
    </div>
  )
}
