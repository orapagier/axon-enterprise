"use client"

type Props = {
  value: string
  onChange: (val: string) => void
  error?: string | null
  disabled?: boolean
  visible?: boolean
}

/**
 * Estimated weight field — number input for kg, with min 1 and step 0.5.
 * Only shown when listing_type === "sell_to_freshhub".
 */
export default function EstimatedKgField({
  value,
  onChange,
  error,
  disabled,
  visible = true,
}: Props) {
  if (!visible) return null

  return (
    <div className="px-7 small:px-12 py-5 border-b border-grey-10">
      <label className="block">
        <div className="flex items-center justify-between mb-2">
          <span className="text-caption font-semibold text-grey-70 uppercase tracking-[0.06em]">
            Estimated weight
          </span>
          <span className="text-[10px] text-grey-50">
            Required for Sell to FreshHub
          </span>
        </div>
        <div className="relative max-w-[200px]">
          <input
            type="number"
            name="estimated_kg"
            value={value}
            onChange={(e) => onChange(e.target.value)}
            min="1"
            step="0.5"
            disabled={disabled}
            placeholder="e.g. 50"
            className={`w-full px-4 py-3 rounded-xl border-2 bg-white text-body-sm text-grey-90 placeholder:text-grey-40 focus:outline-none transition-all ${
              error
                ? "border-red-300 focus-within:ring-2 focus-within:ring-red-100"
                : "border-grey-10 focus-within:border-brand-green-300 focus-within:ring-2 focus-within:ring-brand-green-100"
            }`}
          />
          <span className="absolute right-4 top-1/2 -translate-y-1/2 text-body-sm font-semibold text-grey-50 pointer-events-none">
            kg
          </span>
        </div>
        <div className="mt-1.5 text-[11px] text-grey-50">
          Estimate the total weight of your harvest for this pickup.
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