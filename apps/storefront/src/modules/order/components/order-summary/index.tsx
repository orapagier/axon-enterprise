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

  // The delivery fee is now a real shipping line on the order, so order.total
  // already includes it and order.shipping_total carries the fee. The tier
  // (metadata) is used only to relabel the shipping line.
  const meta = (order.metadata ?? {}) as {
    delivery_tier?: string
  }
  const hasDelivery = meta.delivery_tier != null
  const deliveryFee = order.shipping_total ?? 0
  const grandTotal = order.total ?? 0

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
