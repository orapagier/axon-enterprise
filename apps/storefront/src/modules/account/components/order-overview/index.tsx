"use client"

import OrderCard from "../order-card"
import LocalizedClientLink from "@modules/common/components/localized-client-link"
import { HttpTypes } from "@medusajs/types"

const OrderOverview = ({ orders }: { orders: HttpTypes.StoreOrder[] }) => {
  if (orders?.length) {
    return (
      <div className="flex w-full flex-col gap-y-4">
        {orders.map((o) => (
          <OrderCard key={o.id} order={o} />
        ))}
      </div>
    )
  }

  return (
    <div
      className="flex w-full flex-col items-center justify-center gap-y-4 rounded-2xl border border-dashed border-grey-20 bg-white px-6 py-16 text-center"
      data-testid="no-orders-container"
    >
      <div className="flex h-16 w-16 items-center justify-center rounded-full bg-brand-green-50 text-brand-green-600 ring-1 ring-brand-green-100">
        <svg
          width="28"
          height="28"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.75"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M3 6h18l-1.5 12.5a2 2 0 0 1-2 1.5H6.5a2 2 0 0 1-2-1.5L3 6z" />
          <path d="M3 6 5 2h14l2 4" />
          <path d="M9 11a3 3 0 0 0 6 0" />
        </svg>
      </div>
      <div className="flex flex-col gap-y-1.5">
        <h2 className="font-heading text-h3 text-grey-90">No orders yet</h2>
        <p className="mx-auto max-w-sm text-body-sm text-grey-50">
          Your fresh picks will show up here once you place your first order.
          Let&apos;s change that.
        </p>
      </div>
      <LocalizedClientLink
        href="/store"
        className="mt-2 inline-flex h-11 items-center justify-center gap-x-2 rounded-full bg-brand-green-700 px-6 font-semibold text-white shadow-soft ring-1 ring-brand-green-800/40 transition-all hover:bg-brand-green-800"
        data-testid="continue-shopping-button"
      >
        Start shopping
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
          <line x1="5" y1="12" x2="19" y2="12" />
          <polyline points="12 5 19 12 12 19" />
        </svg>
      </LocalizedClientLink>
    </div>
  )
}

export default OrderOverview
