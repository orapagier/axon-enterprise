import { retrieveCustomer } from "@lib/data/customer"
import { listSellerOrders } from "@lib/data/seller"
import { hasRole } from "@lib/util/roles"
import ProducerOrders from "@modules/account/components/producer-orders"
import { Metadata } from "next"
import { notFound, redirect } from "next/navigation"

export const metadata: Metadata = {
  title: "Incoming orders | Mindanao Fresh Hub",
  description: "Confirm direct orders before the window closes.",
}

type Props = {
  params: Promise<{ countryCode: string }>
}

export default async function ProducerOrdersPage({ params }: Props) {
  const { countryCode } = await params
  const customer = await retrieveCustomer()
  if (!customer) {
    redirect(`/${countryCode}/account`)
  }
  const meta = (customer.metadata ?? {}) as Record<string, unknown>
  if (!hasRole(meta, "producer")) {
    notFound()
  }

  const { orders } = await listSellerOrders()

  return (
    <div className="max-w-2xl">
      <div className="mb-6">
        <h1 className="font-heading font-bold text-h1 text-grey-90 tracking-[-0.02em]">
          Incoming orders<span className="text-brand-gold-500">.</span>
        </h1>
        <p className="text-body-sm text-grey-50 mt-2 leading-relaxed">
          Confirm each order before its window closes. Miss it and the hub steps
          in — and a strike is recorded. Standard orders give you 1 hour; special
          (within-the-hour) orders give you 10 minutes.
        </p>
      </div>
      <ProducerOrders initialOrders={orders} />
    </div>
  )
}
