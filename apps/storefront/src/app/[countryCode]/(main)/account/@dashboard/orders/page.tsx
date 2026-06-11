import { Metadata } from "next"

import OrderOverview from "@modules/account/components/order-overview"
import { notFound } from "next/navigation"
import { listOrders } from "@lib/data/orders"
import TransferRequestForm from "@modules/account/components/transfer-request-form"

export const metadata: Metadata = {
  title: "Orders | Mindanao Fresh Hub",
  description: "Overview of your previous orders.",
}

export default async function Orders() {
  const orders = await listOrders()

  if (!orders) {
    notFound()
  }

  return (
    <div
      className="flex w-full flex-col gap-y-6"
      data-testid="orders-page-wrapper"
    >
      <div className="flex flex-col gap-y-1">
        <h1 className="font-heading text-h2 text-grey-90">Your orders</h1>
        <p className="text-body-sm text-grey-50">
          Track deliveries, revisit past hauls, and manage returns — all in one
          place.
        </p>
      </div>

      <OrderOverview orders={orders} />

      <TransferRequestForm />
    </div>
  )
}
