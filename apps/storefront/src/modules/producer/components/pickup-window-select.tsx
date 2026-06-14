"use client"

import { useMemo } from "react"

type PickupWindow = {
  id: string
  date: string
  start_time: string
  end_time: string
  capacity_kg: number | null
  reserved_kg: number
  status: string
}

type Props = {
  value: string
  onChange: (val: string) => void
  windows: PickupWindow[]
  loading?: boolean
  error?: string | null
  disabled?: boolean
  visible?: boolean
}

/**
 * Pickup window select — replaces the Phase 2 placeholder.
 * Lists open windows in the producer's hub area, sorted by date + start_time.
 */
export default function PickupWindowSelect({
  value,
  onChange,
  windows,
  loading,
  error,
  disabled,
  visible = true,
}: Props) {
  if (!visible) return null

  const sorted = useMemo(() => {
    return [...windows].sort((a, b) => {
      const da = a.date.slice(0, 10)
      const db = b.date.slice(0, 10)
      if (da !== db) return da.localeCompare(db)
      return a.start_time.localeCompare(b.start_time)
    })
  }, [windows])

  return (
    <div className="px-7 small:px-12 py-5 border-b border-grey-10 bg-grey-5/30">
      <label className="block">
        <div className="flex items-center justify-between mb-2">
          <span className="text-caption font-semibold text-grey-70 uppercase tracking-[0.06em]">
            Pickup window
          </span>
          <span className="text-[10px] text-grey-50">
            Required for Sell to FreshHub
          </span>
        </div>

        {loading ? (
          <div className="flex items-center gap-x-2 py-3 text-body-sm text-grey-50">
            <svg
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="animate-ring"
            >
              <path d="M21 12a9 9 0 1 1-6.219-8.56" />
            </svg>
            Loading available windows…
          </div>
        ) : error ? (
          <div className="py-3 text-body-sm text-red-600 font-medium bg-red-50 px-4 rounded-xl border border-red-200">
            {error}
          </div>
        ) : sorted.length === 0 ? (
          <div className="py-3 text-body-sm text-amber-700 bg-amber-50 px-4 rounded-xl border border-amber-200">
            No open pickup windows match your harvest date. Please check back or
            adjust your harvest date.
          </div>
        ) : (
          <>
            <select
              name="pickup_window_id"
              value={value}
              onChange={(e) => onChange(e.target.value)}
              disabled={disabled}
              className={`w-full max-w-md px-4 py-3 rounded-xl border-2 bg-white text-body-sm text-grey-90 focus:outline-none transition-all appearance-none ${
                disabled
                  ? "opacity-60 cursor-not-allowed border-grey-10"
                  : "border-grey-10 focus-within:border-brand-green-300 focus-within:ring-2 focus-within:ring-brand-green-100 cursor-pointer"
              }`}
              style={{
                backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%236B7280' stroke-width='2.5' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpolyline points='6 9 12 15 18 9'/%3E%3C/svg%3E")`,
                backgroundRepeat: "no-repeat",
                backgroundPosition: "right 1rem center",
                paddingRight: "2.5rem",
              }}
            >
              <option value="">Select a pickup window…</option>
              {sorted.map((w) => {
                const dateStr = new Date(w.date).toLocaleDateString("en-PH", {
                  weekday: "short",
                  month: "short",
                  day: "numeric",
                  // Pin the zone so SSR and the client device render the same
                  // string and don't trip a hydration mismatch.
                  timeZone: "Asia/Manila",
                })
                const remaining =
                  w.capacity_kg !== null
                    ? Math.max(0, w.capacity_kg - w.reserved_kg)
                    : null
                const label = `${dateStr} · ${w.start_time}–${w.end_time}${remaining !== null ? ` · ${remaining} kg free` : ""}`
                return (
                  <option key={w.id} value={w.id}>
                    {label}
                  </option>
                )
              })}
            </select>

            <div className="mt-2 text-[11px] text-grey-50">
              {sorted.length} window
              {sorted.length !== 1 ? "s" : ""} available in your hub area.
              Windows fill up as producers reserve slots.
            </div>
          </>
        )}

        {error && !loading && sorted.length > 0 && (
          <div className="mt-1.5 text-[11px] text-red-600 font-medium">
            {error}
          </div>
        )}
      </label>
    </div>
  )
}