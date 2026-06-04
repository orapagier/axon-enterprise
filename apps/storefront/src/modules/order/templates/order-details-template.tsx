"use client"

import { HttpTypes } from "@medusajs/types"
import LocalizedClientLink from "@modules/common/components/localized-client-link"
import Help from "@modules/order/components/help"
import Items from "@modules/order/components/items"
import OrderDetails from "@modules/order/components/order-details"
import OrderSummary from "@modules/order/components/order-summary"
import ShippingDetails from "@modules/order/components/shipping-details"
import React from "react"

type OrderDetailsTemplateProps = {
  order: HttpTypes.StoreOrder
}

const OrderDetailsTemplate: React.FC<OrderDetailsTemplateProps> = ({
  order,
}) => {
  return (
    <div
      className="flex w-full flex-col gap-y-6"
      data-testid="order-details-container"
    >
      <LocalizedClientLink
        href="/account/orders"
        className="inline-flex w-fit items-center gap-x-1.5 text-body-sm font-medium text-grey-50 transition-colors hover:text-brand-green-700"
        data-testid="back-to-overview-button"
      >
        <svg
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <line x1="19" y1="12" x2="5" y2="12" />
          <polyline points="12 19 5 12 12 5" />
        </svg>
        Back to orders
      </LocalizedClientLink>

      <div className="flex flex-col gap-y-1">
        <span className="text-caption font-semibold uppercase tracking-[0.14em] text-brand-gold-700/80">
          Order details
        </span>
        <h1 className="font-heading text-h2 text-grey-90">
          #{order.display_id}
        </h1>
      </div>

      <OrderDetails order={order} showStatus />

      {/* Items + totals */}
      <section className="overflow-hidden rounded-2xl border border-grey-10 bg-white shadow-soft">
        <div className="flex items-center gap-x-3 border-b border-grey-10 px-6 py-5 small:px-7">
          <span className="h-6 w-1 rounded-full bg-brand-gold-400" />
          <h2 className="font-heading text-h3 text-grey-90">Items</h2>
        </div>
        <div className="px-6 py-2 small:px-7">
          <Items order={order} />
        </div>
        <div className="border-t border-grey-10 bg-brand-cream-50/40 px-6 py-6 small:px-7">
          <OrderSummary order={order} />
        </div>
      </section>

      <ShippingDetails order={order} />

      <Help />
    </div>
  )
}

export default OrderDetailsTemplate
