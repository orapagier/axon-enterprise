"use client"

import { convertToLocale } from "@lib/util/money"
import React from "react"

type CartTotalsProps = {
  totals: {
    total?: number | null
    subtotal?: number | null
    tax_total?: number | null
    currency_code: string
    item_subtotal?: number | null
    shipping_subtotal?: number | null
    discount_subtotal?: number | null
  }
  /**
   * Buyer-chosen delivery fee in pesos and its tier, read from cart/order
   * metadata. The fee is deliberately kept OUT of Medusa's totals (COD
   * reconciliation adds it back on top — see lib/delivery-actions.ts), so the
   * buyer-facing "Total" has to add it here to show the true cash-on-delivery
   * payable, Shopee-style. Omitted (cart page, or before a tier is picked) ⇒
   * falls back to the plain Medusa "Shipping" line.
   */
  deliveryFeePhp?: number | null
  deliveryTier?: string | null
}

const TIER_LABELS: Record<string, string> = {
  free: "Free delivery",
  standard: "Standard delivery",
  special: "Special delivery",
}

const CartTotals: React.FC<CartTotalsProps> = ({
  totals,
  deliveryFeePhp,
  deliveryTier,
}) => {
  const {
    currency_code,
    total,
    tax_total,
    item_subtotal,
    shipping_subtotal,
    discount_subtotal,
  } = totals

  const hasDelivery = deliveryTier != null && deliveryFeePhp != null
  // Coerce: metadata round-trips through JSON, so the fee can come back as a
  // string ("30") which would concatenate instead of add. Mirrors the Number()
  // guard in the backend's lib/delivery-actions.ts.
  const rawFee = Number(deliveryFeePhp ?? 0)
  const deliveryFee = Number.isFinite(rawFee) ? rawFee : 0
  // Medusa's `total` already covers items/tax/discount (shipping_subtotal is 0
  // here); the metadata delivery fee is the only piece it's missing.
  const grandTotal = (total ?? 0) + (hasDelivery ? deliveryFee : 0)

  return (
    <div>
      <div className="flex flex-col gap-y-2.5 txt-medium text-ui-fg-subtle">
        <div className="flex items-center justify-between">
          <span>Subtotal</span>
          <span data-testid="cart-subtotal" data-value={item_subtotal || 0}>
            {convertToLocale({ amount: item_subtotal ?? 0, currency_code })}
          </span>
        </div>
        <div className="flex items-center justify-between">
          <span>
            {hasDelivery
              ? TIER_LABELS[deliveryTier!] ?? "Delivery fee"
              : "Shipping"}
          </span>
          <span
            data-testid="cart-shipping"
            data-value={hasDelivery ? deliveryFee : shipping_subtotal || 0}
          >
            {hasDelivery
              ? deliveryFee === 0
                ? "Free"
                : convertToLocale({ amount: deliveryFee, currency_code })
              : convertToLocale({
                  amount: shipping_subtotal ?? 0,
                  currency_code,
                })}
          </span>
        </div>
        {!!discount_subtotal && (
          <div className="flex items-center justify-between">
            <span>Discount</span>
            <span
              className="text-ui-fg-interactive"
              data-testid="cart-discount"
              data-value={discount_subtotal || 0}
            >
              -{" "}
              {convertToLocale({
                amount: discount_subtotal ?? 0,
                currency_code,
              })}
            </span>
          </div>
        )}
        <div className="flex items-center justify-between">
          <span>Taxes</span>
          <span data-testid="cart-taxes" data-value={tax_total || 0}>
            {convertToLocale({ amount: tax_total ?? 0, currency_code })}
          </span>
        </div>
      </div>
      <div className="h-px w-full border-b border-gray-200 my-4" />
      <div className="flex items-center justify-between text-ui-fg-base">
        <span className="font-semibold">Total</span>
        <span
          className="text-lg font-semibold"
          data-testid="cart-total"
          data-value={grandTotal}
        >
          {convertToLocale({ amount: grandTotal, currency_code })}
        </span>
      </div>
    </div>
  )
}

export default CartTotals
