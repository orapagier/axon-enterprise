"use client"

import { getMemberPrice } from "@lib/util/membership"
import { convertToLocale } from "@lib/util/money"
import LocalizedClientLink from "../localized-client-link"

type Props = {
  subtotal: number
  currencyCode: string
  onClick?: () => void
  variant?: "compact" | "default"
}

export default function MembershipUpsellStrip({
  subtotal,
  currencyCode,
  onClick,
  variant = "default",
}: Props) {
  if (subtotal <= 0) return null

  const savings = subtotal - getMemberPrice(subtotal)
  if (savings <= 0) return null

  const savingsLabel = convertToLocale({
    amount: savings,
    currency_code: currencyCode,
  })

  const compact = variant === "compact"

  return (
    <LocalizedClientLink
      href="/account/membership"
      onClick={onClick}
      data-testid="member-upsell-strip"
      className={`group flex items-center gap-x-3 rounded-xl bg-gradient-to-r from-brand-gold-400/20 via-brand-gold-300/10 to-transparent border border-brand-gold-400/40 hover:border-brand-gold-400/70 hover:from-brand-gold-400/25 transition-colors ${
        compact ? "px-3 py-2.5" : "px-4 py-3.5"
      }`}
    >
      <span className="inline-flex items-center justify-center w-8 h-8 rounded-lg bg-brand-gold-400/25 text-brand-gold-700 flex-shrink-0">
        <svg
          width="14"
          height="14"
          viewBox="0 0 24 24"
          fill="currentColor"
          stroke="none"
        >
          <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
        </svg>
      </span>
      <div className="flex-1 min-w-0">
        <div className="text-caption font-semibold text-grey-90 leading-tight">
          Save{" "}
          <span className="tabular-nums">{savingsLabel}</span> with Hub
          Membership
        </div>
        <div className="text-[10px] text-grey-50 mt-0.5 uppercase tracking-widest">
          ₱500 / year · See benefits
        </div>
      </div>
      <svg
        width="14"
        height="14"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="text-grey-50 group-hover:translate-x-0.5 group-hover:text-grey-90 transition-all flex-shrink-0"
      >
        <line x1="5" y1="12" x2="19" y2="12" />
        <polyline points="12 5 19 12 12 19" />
      </svg>
    </LocalizedClientLink>
  )
}
