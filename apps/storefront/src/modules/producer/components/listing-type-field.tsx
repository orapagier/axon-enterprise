"use client"

type Props = {
  value: string
  onChange: (val: string) => void
  disabled?: boolean
}

const options = [
  {
    value: "direct_to_consumer",
    icon: "🛒",
    label: "Sell directly",
    desc: "You're the seller — like a Shopee shop. Your listing goes live right away, and product freshness and quality are your responsibility. Buyers see a notice that the hub doesn't handle this product.",
  },
  {
    value: "sell_to_freshhub",
    icon: "🏭",
    label: "Sell to FreshHub",
    desc: "Bring your harvest to the hub at a scheduled pickup window. The hub buys it, reviews and prices it, then sells it to consumers as FreshHub — the hub is the seller.",
  },
] as const

export default function ListingTypeField({ value, onChange, disabled }: Props) {
  return (
    <div className="px-7 small:px-12 py-5 border-b border-grey-10 bg-grey-5/30">
      <span className="inline-block text-caption font-semibold text-grey-70 uppercase tracking-[0.06em] mb-3">
        Listing type
      </span>
      <div className="grid grid-cols-1 xsmall:grid-cols-2 gap-3">
        {options.map((opt) => {
          const active = (value || "direct_to_consumer") === opt.value
          return (
            <label
              key={opt.value}
              className={`relative flex items-start gap-x-3 p-4 rounded-xl border-2 transition-all select-none ${
                disabled ? "opacity-50 cursor-not-allowed" : "cursor-pointer"
              } ${
                active
                  ? "border-brand-green-500 bg-brand-green-50/30 shadow-soft"
                  : "border-grey-10 bg-white hover:border-grey-20"
              }`}
            >
              <input
                type="radio"
                name="listing_type"
                value={opt.value}
                checked={active}
                onChange={(e) => onChange(e.target.value)}
                disabled={disabled}
                className="sr-only"
              />
              <span className="shrink-0 text-xl mt-0.5">{opt.icon}</span>
              <div>
                <div className="text-body-sm font-semibold text-grey-90">
                  {opt.label}
                </div>
                <div className="text-[11px] text-grey-50 mt-1 leading-relaxed">
                  {opt.desc}
                </div>
              </div>
            </label>
          )
        })}
      </div>
      {disabled && (
        <div className="mt-2 text-[11px] text-amber-700 bg-amber-50 px-3 py-2 rounded-lg border border-amber-200">
          Listing type is locked once a listing has been submitted.
        </div>
      )}
    </div>
  )
}
