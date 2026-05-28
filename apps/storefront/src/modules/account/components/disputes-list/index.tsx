"use client"

import { useEffect, useState } from "react"
import { sdk } from "@lib/config"

type Resolution =
  | "pending"
  | "buyer_fault"
  | "producer_fault"
  | "rider_fault"
  | "platform_fault"

type Reason = "damaged_goods" | "wrong_item" | "not_home" | "other"

type Dispute = {
  id: string
  order_id: string
  rider_notes: string | null
  rider_photo_url: string | null
  buyer_reason: Reason | null
  buyer_notes: string | null
  resolution: Resolution
  resolution_notes: string | null
  created_at: string
}

type AccountStatus = {
  state: "normal" | "warned" | "prepay_locked_30d" | "prepay_locked_permanent"
  state_until: string | null
  strike_count: number
} | null

const REASON_LABEL: Record<Reason, string> = {
  damaged_goods: "Damaged goods",
  wrong_item: "Wrong item",
  not_home: "Not home",
  other: "Other",
}

export default function DisputesList() {
  const [disputes, setDisputes] = useState<Dispute[]>([])
  const [, setStatus] = useState<AccountStatus>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [submittingId, setSubmittingId] = useState<string | null>(null)

  const load = async () => {
    setLoading(true)
    try {
      const body = await sdk.client.fetch<{
        disputes: Dispute[]
        account_status: AccountStatus
      }>("/store/customer/disputes", { method: "GET" })
      setDisputes(body.disputes ?? [])
      setStatus(body.account_status ?? null)
    } catch (e) {
      setError((e as Error).message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
  }, [])

  const respond = async (
    disputeId: string,
    reason: Reason,
    notes: string
  ) => {
    setSubmittingId(disputeId)
    try {
      await sdk.client.fetch(`/store/customer/disputes/${disputeId}/respond`, {
        method: "POST",
        body: { buyer_reason: reason, buyer_notes: notes },
      })
      await load()
    } catch (e) {
      setError((e as Error).message)
    } finally {
      setSubmittingId(null)
    }
  }

  if (loading) return <p className="text-body-sm text-grey-50">Loading…</p>
  if (error) return <p className="text-body-sm text-red-600">{error}</p>
  if (disputes.length === 0)
    return (
      <p className="text-body-sm text-grey-50">
        No disputes on your account. 🌱
      </p>
    )

  return (
    <ul className="flex flex-col gap-4">
      {disputes.map((d) => (
        <li
          key={d.id}
          className="rounded-lg border border-grey-10 p-4 bg-white"
        >
          <div className="flex items-center justify-between mb-2">
            <span className="font-medium">Order {d.order_id}</span>
            <span
              className={`text-caption px-2 py-0.5 rounded ${
                d.resolution === "pending"
                  ? "bg-amber-100 text-amber-800"
                  : d.resolution === "buyer_fault"
                    ? "bg-red-100 text-red-700"
                    : "bg-grey-10 text-grey-70"
              }`}
            >
              {d.resolution}
            </span>
          </div>
          {d.rider_notes && (
            <p className="text-caption text-grey-50 mb-1">
              Rider note: {d.rider_notes}
            </p>
          )}
          {d.buyer_reason ? (
            <p className="text-caption text-grey-90">
              Your response: {REASON_LABEL[d.buyer_reason]} — {d.buyer_notes ?? ""}
            </p>
          ) : d.resolution === "pending" ? (
            <ResponseForm
              onSubmit={(reason, notes) => respond(d.id, reason, notes)}
              submitting={submittingId === d.id}
            />
          ) : null}
          {d.resolution_notes && (
            <p className="text-caption text-grey-50 mt-2">
              Admin note: {d.resolution_notes}
            </p>
          )}
        </li>
      ))}
    </ul>
  )
}

const ResponseForm = ({
  onSubmit,
  submitting,
}: {
  onSubmit: (reason: Reason, notes: string) => void
  submitting: boolean
}) => {
  const [reason, setReason] = useState<Reason>("not_home")
  const [notes, setNotes] = useState("")
  return (
    <div className="mt-3 flex flex-col gap-2 border-t border-grey-10 pt-3">
      <label className="text-caption font-medium">Your side of the story</label>
      <select
        value={reason}
        onChange={(e) => setReason(e.target.value as Reason)}
        className="border border-grey-20 rounded px-2 py-1 text-body-sm w-full"
        disabled={submitting}
      >
        {(Object.keys(REASON_LABEL) as Reason[]).map((r) => (
          <option key={r} value={r}>
            {REASON_LABEL[r]}
          </option>
        ))}
      </select>
      <textarea
        value={notes}
        onChange={(e) => setNotes(e.target.value)}
        rows={2}
        placeholder="What happened?"
        className="border border-grey-20 rounded px-2 py-1 text-body-sm"
        disabled={submitting}
      />
      <button
        type="button"
        onClick={() => onSubmit(reason, notes)}
        disabled={submitting}
        className="self-end px-3 py-1 rounded bg-grey-90 text-white text-body-sm disabled:opacity-50"
      >
        {submitting ? "Submitting…" : "Submit response"}
      </button>
    </div>
  )
}
