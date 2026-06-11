"use client"

import { useMemo, useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import {
  markStopDelivered,
  markStopRefused,
  RiderStop,
  RiderSummary,
} from "@lib/data/rider"

/** Pesos formatter — manifest order totals are in pesos, summary in centavos. */
const peso = (pesos: number) =>
  "₱" +
  pesos.toLocaleString("en-PH", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })

const pesoFromCentavos = (centavos: number) => peso((centavos || 0) / 100)

/** Cash to collect at the door: order total + delivery fee (fee is
 * metadata-only — never folded into order.total — but is collected in cash). */
const collectAmount = (stop: RiderStop) => {
  const total = Number(stop.order?.total ?? 0)
  const fee = Number(stop.order?.metadata?.delivery_fee_php ?? 0)
  return total + fee
}

const stopName = (stop: RiderStop) => {
  const addr = stop.order?.shipping_address
  return (
    `${addr?.first_name ?? ""} ${addr?.last_name ?? ""}`.trim() || "Customer"
  )
}

type SheetState =
  | { mode: "deliver"; stop: RiderStop }
  | { mode: "refuse"; stop: RiderStop }
  | null

export default function RiderDashboard({
  stops,
  summary,
  hubLabel,
}: {
  stops: RiderStop[]
  summary: RiderSummary
  hubLabel: string
}) {
  const router = useRouter()
  const [sheet, setSheet] = useState<SheetState>(null)
  const [notes, setNotes] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [doneIds, setDoneIds] = useState<Record<string, "delivered" | "refused">>({})
  const [isPending, startTransition] = useTransition()

  const visibleStops = useMemo(
    () => stops.filter((s) => !doneIds[s.dispatch_order_id]),
    [stops, doneIds]
  )

  const limit = summary.limit_centavos
  const outstanding = summary.outstanding_centavos
  const cashRatio = limit > 0 ? Math.min(1, outstanding / limit) : 0
  const cashTone =
    limit > 0 && outstanding > limit
      ? "over"
      : limit > 0 && outstanding > limit * 0.8
        ? "warn"
        : "ok"

  const confirm = () => {
    if (!sheet || isPending) return
    const { mode, stop } = sheet
    setError(null)
    startTransition(async () => {
      const result =
        mode === "deliver"
          ? await markStopDelivered(stop.dispatch_order_id)
          : await markStopRefused(stop.dispatch_order_id, notes.trim() || null)
      if (result.ok) {
        setDoneIds((prev) => ({
          ...prev,
          [stop.dispatch_order_id]:
            mode === "deliver" ? "delivered" : "refused",
        }))
        setSheet(null)
        setNotes("")
        router.refresh()
      } else {
        setError(result.error)
      }
    })
  }

  return (
    <div className="flex flex-col gap-y-4 small:gap-y-6">
      {/* Stat strip */}
      <div className="grid grid-cols-3 gap-3 small:gap-4">
        <div className="bg-white rounded-2xl shadow-soft border border-grey-10/60 px-4 py-4">
          <div className="font-heading font-bold text-h1 text-grey-90 leading-none tabular-nums">
            {visibleStops.length}
          </div>
          <div className="text-[10px] uppercase tracking-widest text-grey-50 font-semibold mt-1.5">
            Stops left
          </div>
        </div>
        <div className="bg-white rounded-2xl shadow-soft border border-grey-10/60 px-4 py-4">
          <div className="font-heading font-bold text-h1 text-brand-green-700 leading-none tabular-nums">
            {summary.today.delivered_count}
          </div>
          <div className="text-[10px] uppercase tracking-widest text-grey-50 font-semibold mt-1.5">
            Done today
          </div>
        </div>
        <div className="bg-white rounded-2xl shadow-soft border border-grey-10/60 px-4 py-4 min-w-0">
          <div className="font-heading font-bold text-h3 small:text-h2 text-grey-90 leading-none tabular-nums truncate">
            {pesoFromCentavos(summary.today.collected_centavos)}
          </div>
          <div className="text-[10px] uppercase tracking-widest text-grey-50 font-semibold mt-1.5">
            Collected today
          </div>
        </div>
      </div>

      {/* Cash-in-hand bar */}
      <div
        className={`rounded-2xl border p-4 small:p-5 ${
          cashTone === "over"
            ? "bg-red-50 border-red-200"
            : cashTone === "warn"
              ? "bg-brand-gold-50 border-brand-gold-200"
              : "bg-white border-grey-10/60 shadow-soft"
        }`}
      >
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div className="min-w-0">
            <div className="text-[10px] uppercase tracking-widest font-semibold text-grey-50">
              Cash in hand · unremitted COD
            </div>
            <div
              className={`font-heading font-bold text-h2 tabular-nums leading-tight ${
                cashTone === "over"
                  ? "text-red-700"
                  : cashTone === "warn"
                    ? "text-brand-gold-800"
                    : "text-grey-90"
              }`}
            >
              {pesoFromCentavos(outstanding)}
            </div>
          </div>
          <div className="text-caption text-grey-50 text-right">
            {cashTone === "over" ? (
              <span className="font-semibold text-red-700">
                Over the {pesoFromCentavos(limit)} limit — remit at the hub
                counter now
              </span>
            ) : cashTone === "warn" ? (
              <span className="font-semibold text-brand-gold-800">
                Near the {pesoFromCentavos(limit)} limit — remit soon
              </span>
            ) : (
              <>Remit at the {hubLabel} counter</>
            )}
          </div>
        </div>
        {limit > 0 && (
          <div className="mt-3 h-1.5 rounded-full bg-grey-10 overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-500 ${
                cashTone === "over"
                  ? "bg-red-500"
                  : cashTone === "warn"
                    ? "bg-brand-gold-500"
                    : "bg-brand-green-500"
              }`}
              style={{ width: `${Math.round(cashRatio * 100)}%` }}
            />
          </div>
        )}
      </div>

      {/* Manifest */}
      {visibleStops.length === 0 ? (
        <div className="bg-white rounded-3xl border border-dashed border-grey-20 p-10 text-center">
          <div className="mx-auto w-14 h-14 rounded-2xl bg-brand-green-50 border border-brand-green-100 flex items-center justify-center text-2xl mb-4">
            ✓
          </div>
          <div className="font-heading font-bold text-h2 text-grey-90 tracking-[-0.015em]">
            All clear — end of run
          </div>
          <p className="text-body-sm text-grey-50 mt-2 max-w-md mx-auto">
            No deliveries on your sheet. New stops appear here when your batch
            is dispatched from the hub.
          </p>
        </div>
      ) : (
        <ol className="flex flex-col gap-y-3 small:gap-y-4" data-testid="rider-manifest">
          {visibleStops.map((stop, i) => {
            const addr = stop.order?.shipping_address
            const meta = (stop.order?.metadata ?? {}) as Record<string, unknown>
            const barangay =
              (addr?.metadata as Record<string, unknown> | null | undefined)
                ?.barangay ?? meta.delivery_barangay
            const tier =
              typeof meta.delivery_tier === "string" ? meta.delivery_tier : null
            return (
              <li
                key={stop.dispatch_order_id}
                className="bg-white rounded-2xl shadow-soft border border-grey-10/60 overflow-hidden"
              >
                <div className="flex">
                  {/* Stop number rail */}
                  <div className="flex flex-col items-center justify-start shrink-0 w-14 small:w-16 py-4 bg-brand-green-50/60 border-r border-dashed border-brand-green-100">
                    <span className="font-heading font-bold text-h2 text-brand-green-700 leading-none">
                      {i + 1}
                    </span>
                    <span className="text-[9px] uppercase tracking-[0.22em] text-brand-green-800/60 font-bold mt-1">
                      Stop
                    </span>
                  </div>

                  {/* Body */}
                  <div className="flex-1 min-w-0 p-4 small:p-5">
                    <div className="flex items-baseline justify-between gap-2">
                      <span className="font-heading font-bold text-body-lg text-grey-90 truncate">
                        {stopName(stop)}
                      </span>
                      <span className="text-caption font-bold text-grey-40 tabular-nums whitespace-nowrap">
                        #{stop.order?.display_id ?? "?"}
                      </span>
                    </div>

                    <p className="text-body-sm text-grey-50 mt-1 leading-snug">
                      {barangay ? (
                        <span className="font-semibold text-grey-70">
                          {String(barangay)} ·{" "}
                        </span>
                      ) : null}
                      {addr?.address_1 ?? ""}
                      {addr?.city ? `, ${addr.city}` : ""}
                    </p>

                    <div className="flex items-center flex-wrap gap-2 mt-3">
                      {addr?.phone && (
                        <a
                          href={`tel:${addr.phone}`}
                          className="inline-flex items-center gap-x-1.5 px-3 py-1.5 rounded-full border border-grey-20 bg-white text-caption font-semibold text-grey-70 hover:border-brand-green-300 hover:text-brand-green-700 transition-colors"
                        >
                          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" />
                          </svg>
                          {addr.phone}
                        </a>
                      )}
                      <span
                        className={`inline-flex items-center gap-x-1.5 px-3 py-1.5 rounded-full text-caption font-bold tabular-nums ${
                          tier === "special"
                            ? "bg-brand-gold-50 text-brand-gold-800 border border-brand-gold-200"
                            : "bg-brand-green-50 text-brand-green-800 border border-brand-green-100"
                        }`}
                      >
                        Collect {peso(collectAmount(stop))}
                        {tier ? (
                          <span className="font-semibold uppercase tracking-wider text-[9px] opacity-70">
                            {tier}
                          </span>
                        ) : null}
                      </span>
                    </div>

                    <div className="flex items-center gap-3 mt-4">
                      <button
                        type="button"
                        onClick={() => {
                          setError(null)
                          setSheet({ mode: "deliver", stop })
                        }}
                        className="flex-1 small:flex-none small:px-8 py-2.5 rounded-xl bg-grey-90 hover:bg-brand-green-700 text-white text-body-sm font-semibold shadow-soft transition-colors"
                        data-testid="deliver-button"
                      >
                        Delivered ✓
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setError(null)
                          setNotes("")
                          setSheet({ mode: "refuse", stop })
                        }}
                        className="px-4 py-2.5 rounded-xl text-body-sm font-semibold text-red-600 hover:bg-red-50 transition-colors"
                        data-testid="refuse-button"
                      >
                        Refused
                      </button>
                    </div>
                  </div>
                </div>
              </li>
            )
          })}
        </ol>
      )}

      {/* Confirm dialog */}
      {sheet && (
        <div className="fixed inset-0 z-[60] flex items-end small:items-center justify-center">
          <button
            type="button"
            aria-label="Close"
            className="absolute inset-0 bg-grey-90/50"
            onClick={() => !isPending && setSheet(null)}
          />
          <div className="relative w-full small:max-w-md bg-white rounded-t-3xl small:rounded-3xl shadow-xl p-6 pb-[calc(1.5rem+env(safe-area-inset-bottom))]">
            <div className="w-10 h-1 rounded-full bg-grey-20 mx-auto mb-4 small:hidden" />
            <h3 className="font-heading font-bold text-h2 text-grey-90">
              {sheet.mode === "deliver" ? "Confirm delivery" : "Mark as refused"}
            </h3>
            <p className="text-caption text-grey-50 mt-1">
              Order #{sheet.stop.order?.display_id ?? "?"} ·{" "}
              {stopName(sheet.stop)}
            </p>

            {sheet.mode === "deliver" ? (
              <div className="mt-5 rounded-2xl border-2 border-dashed border-brand-green-300 bg-brand-green-50 px-4 py-4 text-center">
                <div className="text-[10px] uppercase tracking-[0.22em] font-bold text-brand-green-800/70">
                  Collect from buyer
                </div>
                <div className="font-heading font-bold text-display text-brand-green-700 tabular-nums leading-tight">
                  {peso(collectAmount(sheet.stop))}
                </div>
              </div>
            ) : (
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="What happened? (e.g. buyer not home, refused at door)"
                className="mt-5 w-full min-h-[96px] rounded-xl border border-grey-20 bg-grey-5 p-3 text-body-sm focus:outline-none focus:border-red-300 focus:bg-white transition-colors"
              />
            )}

            {error && (
              <p className="mt-3 text-body-sm text-red-600 bg-red-50 border border-red-100 rounded-xl px-3 py-2">
                {error}
              </p>
            )}

            <div className="flex gap-3 mt-5">
              <button
                type="button"
                onClick={() => setSheet(null)}
                disabled={isPending}
                className="px-5 py-3 rounded-xl border border-grey-20 text-body-sm font-semibold text-grey-70 hover:bg-grey-5 transition-colors disabled:opacity-50"
              >
                Back
              </button>
              <button
                type="button"
                onClick={confirm}
                disabled={isPending}
                className={`flex-1 py-3 rounded-xl text-white text-body-sm font-bold shadow-soft transition-colors disabled:opacity-60 ${
                  sheet.mode === "deliver"
                    ? "bg-brand-green-600 hover:bg-brand-green-700"
                    : "bg-red-600 hover:bg-red-700"
                }`}
                data-testid="confirm-action-button"
              >
                {isPending
                  ? "Saving…"
                  : sheet.mode === "deliver"
                    ? "Cash collected — delivered"
                    : "Confirm refusal"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
