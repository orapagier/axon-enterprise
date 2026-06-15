import { convertToLocale } from "@lib/util/money"
import { HttpTypes } from "@medusajs/types"

type OrderSummaryProps = {
  order: HttpTypes.StoreOrder
}

const TIER_LABELS: Record<string, string> = {
  free: "Free delivery",
  standard: "Standard delivery",
  special: "Special delivery",
}

const OrderSummary = ({ order }: OrderSummaryProps) => {
  const getAmount = (amount?: number | null) =>
    amount != null
      ? convertToLocale({ amount, currency_code: order.currency_code })
      : "—"

  // The delivery fee is metadata-only (kept out of order.total so COD
  // reconciliation can add it back — see lib/delivery-actions.ts), so the
  // buyer-facing total must add it here to match what they paid at checkout.
  const meta = (order.metadata ?? {}) as {
    delivery_fee_php?: number
    delivery_tier?: string
  }
  const hasDelivery = meta.delivery_tier != null && meta.delivery_fee_php != null
  // Coerce: JSON metadata can hand the fee back as a string, which would
  // concatenate instead of add (mirrors the backend Number() guard).
  const rawFee = Number(meta.delivery_fee_php ?? 0)
  const deliveryFee = Number.isFinite(rawFee) ? rawFee : 0
  const grandTotal = (order.total ?? 0) + (hasDelivery ? deliveryFee : 0)

  return (
    <div className="flex flex-col gap-y-2.5 text-body-sm text-grey-60">
      <div className="flex items-center justify-between">
        <span>Subtotal</span>
        <span className="text-grey-90">{getAmount(order.subtotal)}</span>
      </div>

      {order.discount_total > 0 && (
        <div className="flex items-center justify-between">
          <span>Discount</span>
          <span className="text-brand-green-700">
            - {getAmount(order.discount_total)}
          </span>
        </div>
      )}

      {order.gift_card_total > 0 && (
        <div className="flex items-center justify-between">
          <span>Gift card</span>
          <span className="text-brand-green-700">
            - {getAmount(order.gift_card_total)}
          </span>
        </div>
      )}

      <div className="flex items-center justify-between">
        <span>
          {hasDelivery
            ? TIER_LABELS[meta.delivery_tier!] ?? "Delivery fee"
            : "Shipping"}
        </span>
        <span className="text-grey-90">
          {hasDelivery
            ? deliveryFee === 0
              ? "Free"
              : getAmount(deliveryFee)
            : getAmount(order.shipping_total)}
        </span>
      </div>

      <div className="flex items-center justify-between">
        <span>Taxes</span>
        <span className="text-grey-90">{getAmount(order.tax_total)}</span>
      </div>

      <div className="my-2 h-px w-full border-b border-dashed border-grey-20" />

      <div className="flex items-center justify-between">
        <span className="font-semibold text-grey-90">Total</span>
        <span className="font-heading text-h3 text-grey-90">
          {getAmount(grandTotal)}
        </span>
      </div>
    </div>
  )
}

export default OrderSummary
