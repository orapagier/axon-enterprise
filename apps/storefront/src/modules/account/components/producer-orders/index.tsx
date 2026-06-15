"use client"

import {
  confirmSellerOrder,
  declineSellerOrder,
  disputeSellerStrike,
  type SellerOrder,
} from "@lib/data/seller"
import LocalizedClientLink from "@modules/common/components/localized-client-link"
import { useRouter } from "next/navigation"
import { useEffect, useState, useTransition } from "react"

const STATUS_CHIP: Record<
  SellerOrder["status"],
  { label: string; cls: string }
> = {
  awaiting: { label: "Needs confirmation", cls: "bg-brand-gold-400 text-grey-90" },
  escalated: { label: "Overdue — hub notified", cls: "bg-red-500 text-white" },
  confirmed: { label: "Confirmed", cls: "bg-brand-green-700 text-white" },
  hub_taken: { label: "Hub took over", cls: "bg-grey-90 text-white" },
  declined: { label: "Declined", cls: "bg-grey-60 text-white" },
  cancelled: { label: "Cancelled", cls: "bg-grey-60 text-white" },
}

const TIER_LABEL: Record<SellerOrder["tier"], string> = {
  free: "Free delivery",
  standard: "Standard delivery",
  special: "Special (within 1h)",
}

function useNow(intervalMs = 1000) {
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), intervalMs)
    return () => clearInterval(t)
  }, [intervalMs])
  return now
}

function countdown(target: number, now: number): string {
  const ms = target - now
  if (ms <= 0) return "0:00"
  const total = Math.floor(ms / 1000)
  const m = Math.floor(total / 60)
  const s = total % 60
  return `${m}:${s.toString().padStart(2, "0")}`
}

export default function ProducerOrders({
  initialOrders,
}: {
  initialOrders: SellerOrder[]
}) {
  const router = useRouter()
  const now = useNow()
  const [orders, setOrders] = useState(initialOrders)
  const [pending, startTransition] = useTransition()
  const [busyId, setBusyId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  // Keep in sync when the server component refreshes after an action.
  useEffect(() => setOrders(initialOrders), [initialOrders])

  const act = (
    orderId: string,
    fn: () => Promise<{ ok: boolean; error?: string }>
  ) => {
    setError(null)
    setBusyId(orderId)
    startTransition(async () => {
      const r = await fn()
      setBusyId(null)
      if (!r.ok) {
        setError(r.error ?? "Something went wrong.")
        return
      }
      router.refresh()
    })
  }

  const handleDecline = (orderId: string) => {
    if (
      !confirm(
        "Decline this order? It will be cancelled and a strike recorded on your account."
      )
    )
      return
    act(orderId, () => declineSellerOrder(orderId))
  }

  const handleDispute = (orderId: string) => {
    const note = prompt(
      "Tell us why this strike is unfair (optional). We'll review it."
    )
    if (note === null) return
    act(orderId, () => disputeSellerStrike(orderId, note))
  }

  if (!orders.length) {
    return (
      <div className="rounded-2xl border border-grey-10 bg-white p-10 text-center">
        <p className="text-body-sm text-grey-60">
          No incoming orders yet. When a buyer orders one of your direct
          listings, it shows up here to confirm.
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-body-sm text-red-800">
          {error}
        </div>
      )}

      {orders.map((o) => {
        const chip = STATUS_CHIP[o.status]
        const isAwaiting = o.status === "awaiting"
        const isEscalated = o.status === "escalated"
        const live = isAwaiting || isEscalated
        const target = isEscalated ? o.admin_deadline_at : o.deadline_at
        const busy = busyId === o.order_id && pending
        const canDispute =
          o.strike_recorded &&
          ["confirmed", "hub_taken", "declined", "cancelled"].includes(o.status)

        return (
          <div
            key={`${o.order_id}-${o.status}`}
            className="rounded-2xl border-2 border-grey-10 bg-white p-5"
          >
            <div className="flex items-start justify-between gap-x-4">
              <div className="min-w-0">
                <div className="flex items-center gap-x-2 mb-1">
                  <span className="font-heading font-bold text-grey-90">
                    Order #{o.display_id}
                  </span>
                  <span
                    className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wide ${chip.cls}`}
                  >
                    {chip.label}
                  </span>
                </div>
                <p className="text-body-sm text-grey-80 truncate">{o.items}</p>
                <p className="text-caption text-grey-50 mt-0.5">
                  {TIER_LABEL[o.tier]}
                  {o.buyer_name ? ` · ${o.buyer_name}` : ""}
                </p>
              </div>

              {live && target && (
                <div className="text-right shrink-0">
                  <div
                    className={`font-heading font-bold tabular-nums text-xl ${
                      target - now <= 0 ? "text-red-600" : "text-grey-90"
                    }`}
                  >
                    {countdown(target, now)}
                  </div>
                  <div className="text-[10px] text-grey-50 uppercase tracking-wide">
                    {isEscalated ? "hub window" : "to confirm"}
                  </div>
                </div>
              )}
            </div>

            {isEscalated && (
              <p className="mt-3 text-caption text-amber-800 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
                The confirmation window passed and the hub was notified. You can
                still confirm (it counts as late and records a strike) until the
                hub takes over.
              </p>
            )}

            {live && (
              <div className="mt-4 flex gap-2">
                <button
                  type="button"
                  disabled={busy}
                  onClick={() =>
                    act(o.order_id, () => confirmSellerOrder(o.order_id))
                  }
                  className="flex-1 inline-flex items-center justify-center gap-x-2 px-4 py-2.5 rounded-xl bg-brand-green-700 hover:bg-brand-green-800 text-white text-body-sm font-semibold transition-colors disabled:opacity-60"
                >
                  {busy ? "Working…" : "Confirm order"}
                </button>
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => handleDecline(o.order_id)}
                  className="px-4 py-2.5 rounded-xl border-2 border-grey-15 hover:border-red-300 hover:text-red-600 text-grey-70 text-body-sm font-semibold transition-colors disabled:opacity-60"
                >
                  Decline
                </button>
              </div>
            )}

            {canDispute && (
              <div className="mt-3 flex items-center justify-between gap-x-3">
                <span className="text-caption text-grey-50">
                  A strike was recorded for this order.
                </span>
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => handleDispute(o.order_id)}
                  className="text-caption font-semibold text-ui-fg-interactive hover:underline disabled:opacity-60"
                >
                  Dispute strike
                </button>
              </div>
            )}
          </div>
        )
      })}

      <div className="pt-2">
        <LocalizedClientLink
          href="/account/producer"
          className="text-body-sm font-medium text-grey-60 hover:text-grey-90"
        >
          ← Back to dashboard
        </LocalizedClientLink>
      </div>
    </div>
  )
}
