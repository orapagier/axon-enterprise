import { clx } from "@modules/common/components/ui"

import { getProductPrice } from "@lib/util/get-product-price"
import { getMemberPrice } from "@lib/util/membership"
import { convertToLocale } from "@lib/util/money"
import { getProductUnit, getUnitLabel } from "@lib/util/unit"
import { HttpTypes } from "@medusajs/types"

export default function ProductPrice({
  product,
  variant,
  isMember = false,
}: {
  product: HttpTypes.StoreProduct
  variant?: HttpTypes.StoreProductVariant
  isMember?: boolean
}) {
  const unit = getProductUnit(product)

  const { cheapestPrice, variantPrice } = getProductPrice({
    product,
    variantId: variant?.id,
  })

  const selectedPrice = variant ? variantPrice : cheapestPrice

  if (!selectedPrice) {
    return <div className="block w-32 h-9 bg-grey-5 animate-pulse rounded-lg" />
  }

  const isSale = selectedPrice.price_type === "sale"
  const memberAmount = isSale
    ? null
    : getMemberPrice(selectedPrice.calculated_price_number)
  const memberLabel = memberAmount !== null
    ? convertToLocale({
        amount: memberAmount,
        currency_code: selectedPrice.currency_code,
      })
    : null

  // Member view: member price headline + struck-through list price + Member pill.
  if (isMember && memberLabel) {
    return (
      <div className="flex flex-col gap-y-1.5">
        <div className="flex items-baseline gap-x-3 flex-wrap">
          <span
            className="text-h1 font-bold text-grey-90 tabular-nums"
            data-testid="product-price"
            data-value={memberAmount}
          >
            {!variant && "From "}
            {memberLabel}
            <span className="text-body-sm font-normal text-grey-50">
              {" "}per {getUnitLabel(unit, 1)}
            </span>
          </span>
          <span className="inline-flex items-center gap-x-1.5 px-2 py-0.5 rounded-md bg-brand-gold-400/15 border border-brand-gold-400/40 text-caption font-bold uppercase tracking-wider text-brand-gold-600">
            <svg
              width="10"
              height="10"
              viewBox="0 0 24 24"
              fill="currentColor"
              stroke="none"
            >
              <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
            </svg>
            Member price
          </span>
        </div>
        <div className="flex items-center gap-x-2 text-body-sm">
          <span
            className="line-through text-grey-40 tabular-nums"
            data-testid="list-price"
            data-value={selectedPrice.calculated_price_number}
          >
            {selectedPrice.calculated_price}
          </span>
          <span className="text-caption font-semibold text-brand-gold-700">
            You save{" "}
            <span className="tabular-nums">
              {convertToLocale({
                amount:
                  selectedPrice.calculated_price_number - (memberAmount ?? 0),
                currency_code: selectedPrice.currency_code,
              })}
            </span>
          </span>
        </div>
      </div>
    )
  }

  // Free user view (existing behaviour + member-price annotation).
  return (
    <div className="flex flex-col gap-y-1">
      <span
        className={clx("text-h1 font-bold text-grey-90", {
          "text-brand-green-600": isSale,
        })}
      >
        {!variant && "From "}
        <span
          data-testid="product-price"
          data-value={selectedPrice.calculated_price_number}
        >
          {selectedPrice.calculated_price}
        </span>
      </span>
      {isSale && (
        <div className="flex items-center gap-x-2">
          <span
            className="line-through text-body-sm text-grey-40"
            data-testid="original-product-price"
            data-value={selectedPrice.original_price_number}
          >
            {selectedPrice.original_price}
          </span>
          <span className="text-caption font-semibold text-brand-green-600 bg-brand-green-50 px-2 py-0.5 rounded-md">
            -{selectedPrice.percentage_diff}%
          </span>
        </div>
      )}
      {memberLabel && (
        <div
          className="flex items-center gap-x-1.5 text-caption mt-0.5"
          data-testid="member-price-hint"
        >
          <span className="inline-flex items-center px-1.5 py-0.5 rounded-md bg-brand-gold-400/15 border border-brand-gold-400/40 text-[10px] font-bold uppercase tracking-wider text-brand-gold-600 leading-none">
            Member
          </span>
          <span className="text-grey-60">
            <span className="tabular-nums font-bold text-grey-90">
              {memberLabel}
            </span>{" "}
            with Hub Membership
          </span>
        </div>
      )}
    </div>
  )
}
