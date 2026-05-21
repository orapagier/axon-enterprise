"use client"

import { useMemo } from "react"

type Props = {
  value: string
  onChange: (val: string) => void
  error?: string | null
  disabled?: boolean
  visible?: boolean
}

/**
 * Harvest date field — restricted to today + 3..5 days.
 * Only shown when listing_type === "sell_to_freshhub".
 */
export default function HarvestDateField({
  value,
  onChange,
  error,
  disabled,
  visible = true,
}: Props) {
  const { minDate, maxDate } = useMemo(() => {
    const now = new Date()
    // Approximate Manila timezone (UTC+8)
    const tzOffset = 8 * 60
    const localNow = new Date(now.getTime() + tzOffset * 60_000)
    const today = new Date(
      localNow.getUTCFullYear(),
      localNow.getUTCMonth(),
      localNow.getUTCDate()
    )

    const min = new Date(today)
    min.setDate(min.getDate() + 3)
    const max = new Date(today)
    max.setDate(max.getDate() + 5)

    const fmt = (d: Date) => d.toISOString().slice(0, 10)
    return { minDate: fmt(min), maxDate: fmt(max) }
  }, [])

  if (!visible) return null

  return (
    <div className="px-7 small:px-12 py-5 border-b border-grey-10">
      <label className="block">
        <div className="flex items-center justify-between mb-2">
          <span className="text-caption font-semibold text-grey-70 uppercase tracking-[0.06em]">
            Harvest date
          </span>
          <span className="text-[10px] text-grey-50">
            Required for Sell to FreshHub
          </span>
        </div>
        <input
          type="date"
          name="harvest_date"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          min={minDate}
          max={maxDate}
          disabled={disabled}
          className={`w-full max-w-xs px-4 py-3 rounded-xl border-2 bg-white text-body-sm text-grey-90 placeholder:text-grey-40 focus:outline-none transition-all ${
            error
              ? "border-red-300 focus-within:ring-2 focus-within:ring-red-100"
              : "border-grey-10 focus-within:border-brand-green-300 focus-within:ring-2 focus-within:ring-brand-green-100"
          }`}
        />
        <div className="mt-1.5 text-[11px] text-grey-50">
          Harvest must be {minDate} – {maxDate} to allow scheduling.
        </div>
        {error && (
          <div className="mt-1.5 text-[11px] text-red-600 font-medium">
            {error}
          </div>
        )}
      </label>
    </div>
  )
}