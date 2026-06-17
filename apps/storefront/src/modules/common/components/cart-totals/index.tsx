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
   * Chosen delivery tier, used only to relabel the shipping line (e.g.
   * "Standard delivery" instead of "Shipping"). The fee itself is a real
   * shipping method now, so the amount comes from Medusa's `shipping_subtotal`
   * and is already part of `total` — nothing is added on top here.
   */
  deliveryTier?: string | null
}

const TIER_LABELS: Record<string, string> = {
  free: "Free delivery",
  standard: "Standard delivery",
  special: "Special delivery",
}

const CartTotals: React.FC<CartTotalsProps> = ({ totals, deliveryTier }) => {
  const {
    currency_code,
    total,
    tax_total,
    item_subtotal,
    shipping_subtotal,
    discount_subtotal,
  } = totals

  const shipping = shipping_subtotal ?? 0
  // The delivery fee is a real shipping line, so Medusa's `total` already
  // includes it.
  const grandTotal = total ?? 0

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
            {deliveryTier
              ? TIER_LABELS[deliveryTier] ?? "Delivery"
              : "Shipping"}
          </span>
          <span data-testid="cart-shipping" data-value={shipping}>
            {shipping === 0 && deliveryTier
              ? "Free"
              : convertToLocale({ amount: shipping, currency_code })}
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
