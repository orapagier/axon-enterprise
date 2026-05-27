import { retrieveCustomer } from "@lib/data/customer"
import { getMemberPrice, isMember } from "@lib/util/membership"
import { convertToLocale } from "@lib/util/money"
import { getUnitLabel } from "@lib/util/unit"
import { clx } from "@modules/common/components/ui"
import { VariantPrice } from "types/global"

export default async function PreviewPrice({ price, unit = "kg" }: { price: VariantPrice; unit?: string }) {
  if (!price) {
    return null
  }

  const isSale = price.price_type === "sale"
  const customer = await retrieveCustomer().catch(() => null)
  const member = isMember(customer)

  // Member discount applies to non-sale items only. Sale items already
  // represent a markdown; we don't stack the two for MVP.
  const memberAmount = isSale ? null : getMemberPrice(price.calculated_price_number)
  const memberLabel = memberAmount !== null
    ? convertToLocale({
        amount: memberAmount,
        currency_code: price.currency_code,
      })
    : null

  // Member view: member price as the primary, struck-through list price below.
  if (member && memberLabel) {
    return (
      <div className="flex flex-col" data-testid="preview-price-member">
        <div className="flex items-baseline gap-x-1">
          <span
            className="font-heading text-body-sm font-bold tabular-nums leading-none tracking-[-0.01em] text-grey-90"
            data-testid="price"
          >
            {memberLabel}
          </span>
          <span className="text-[10px] text-grey-50 font-bold leading-none uppercase tracking-[0.12em]">
            /{getUnitLabel(unit, 1)}
          </span>
        </div>
        <div className="flex items-center gap-x-1.5 mt-1">
          <span className="inline-flex items-center px-1.5 py-0.5 rounded-md bg-brand-gold-400/15 border border-brand-gold-400/40 text-[9px] font-bold uppercase tracking-[0.12em] text-brand-gold-600 leading-none">
            Member
          </span>
          <span className="text-[10px] text-grey-40 line-through tabular-nums leading-none">
            {price.calculated_price}
          </span>
        </div>
      </div>
    )
  }

  // Free user view (existing behavior + optional "Member ₱X" annotation).
  return (
    <div className="flex flex-col">
      {isSale && (
        <span
          className="line-through text-[10px] text-grey-40 leading-none tabular-nums"
          data-testid="original-price"
        >
          {price.original_price}
        </span>
      )}
      <div className="flex items-baseline gap-x-1 mt-0.5">
        <span
          className={clx(
            "font-heading text-body-sm font-bold tabular-nums leading-none tracking-[-0.01em]",
            {
              "text-brand-green-700": isSale,
              "text-grey-90": !isSale,
            }
          )}
          data-testid="price"
        >
          {price.calculated_price}
        </span>
        <span className="text-[10px] text-grey-50 font-bold leading-none uppercase tracking-[0.12em]">
          /{getUnitLabel(unit, 1)}
        </span>
      </div>
      {memberLabel && (
        <span
          className="text-[10px] font-semibold leading-none mt-1.5 text-brand-gold-600 tabular-nums"
          data-testid="member-price-hint"
        >
          Member{" "}
          <span className="font-bold">{memberLabel}</span>
        </span>
      )}
    </div>
  )
}
