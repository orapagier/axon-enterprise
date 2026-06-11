"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import {
  Dispute,
  DisputeReason,
  respondToDispute,
} from "@lib/data/disputes"

const REASON_LABEL: Record<DisputeReason, string> = {
  damaged_goods: "Damaged goods",
  wrong_item: "Wrong item",
  not_home: "Not home",
  other: "Other",
}

const RESOLUTION_LABEL: Record<Dispute["resolution"], string> = {
  pending: "Pending review",
  buyer_fault: "Buyer fault",
  producer_fault: "Producer fault",
  rider_fault: "Rider fault",
  platform_fault: "Platform fault",
}

export default function DisputesList({ disputes }: { disputes: Dispute[] }) {
  const router = useRouter()
  const [error, setError] = useState<string | null>(null)
  const [submittingId, setSubmittingId] = useState<string | null>(null)
  const [, startTransition] = useTransition()

  const respond = (disputeId: string, reason: DisputeReason, notes: string) => {
    setSubmittingId(disputeId)
    setError(null)
    startTransition(async () => {
      const result = await respondToDispute(disputeId, reason, notes)
      if (!result.ok) {
        setError(result.error)
      } else {
        router.refresh()
      }
      setSubmittingId(null)
    })
  }

  if (disputes.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-grey-20 bg-white px-4 py-10 text-center text-body-sm text-grey-50">
        No disputes on your account. 🌱
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-4">
      {error && (
        <p className="text-body-sm text-red-600 bg-red-50 border border-red-100 rounded-xl px-3 py-2">
          {error}
        </p>
      )}
      <ul className="flex flex-col gap-4">
        {disputes.map((d) => (
          <li
            key={d.id}
            className="rounded-2xl border border-grey-10/60 shadow-soft p-4 small:p-5 bg-white"
          >
            <div className="flex items-center justify-between gap-2 mb-2">
              <span className="text-body-sm font-bold text-grey-90 truncate">
                Order {d.order_id}
              </span>
              <span
                className={`shrink-0 text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full ${
                  d.resolution === "pending"
                    ? "bg-brand-gold-50 text-brand-gold-800 border border-brand-gold-200"
                    : d.resolution === "buyer_fault"
                      ? "bg-red-50 text-red-700 border border-red-200"
                      : "bg-grey-5 text-grey-60 border border-grey-10"
                }`}
              >
                {RESOLUTION_LABEL[d.resolution]}
              </span>
            </div>
            {d.rider_notes && (
              <p className="text-caption text-grey-50 mb-1">
                Rider note: {d.rider_notes}
              </p>
            )}
            {d.buyer_reason ? (
              <p className="text-caption text-grey-90">
                Your response: {REASON_LABEL[d.buyer_reason]}
                {d.buyer_notes ? ` — ${d.buyer_notes}` : ""}
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
    </div>
  )
}

const ResponseForm = ({
  onSubmit,
  submitting,
}: {
  onSubmit: (reason: DisputeReason, notes: string) => void
  submitting: boolean
}) => {
  const [reason, setReason] = useState<DisputeReason>("not_home")
  const [notes, setNotes] = useState("")
  return (
    <div className="mt-3 flex flex-col gap-2 border-t border-grey-10 pt-3">
      <label className="text-caption font-semibold text-grey-70">
        Your side of the story
      </label>
      <select
        value={reason}
        onChange={(e) => setReason(e.target.value as DisputeReason)}
        className="border border-grey-20 rounded-xl px-3 py-2 text-body-sm w-full bg-white focus:outline-none focus:border-brand-green-400"
        disabled={submitting}
      >
        {(Object.keys(REASON_LABEL) as DisputeReason[]).map((r) => (
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
        className="border border-grey-20 rounded-xl px-3 py-2 text-body-sm bg-white focus:outline-none focus:border-brand-green-400"
        disabled={submitting}
      />
      <button
        type="button"
        onClick={() => onSubmit(reason, notes)}
        disabled={submitting}
        className="self-end px-4 py-2 rounded-xl bg-grey-90 hover:bg-brand-green-700 text-white text-body-sm font-semibold transition-colors disabled:opacity-50"
      >
        {submitting ? "Submitting…" : "Submit response"}
      </button>
    </div>
  )
}
