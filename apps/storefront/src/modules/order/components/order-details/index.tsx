import { HttpTypes } from "@medusajs/types"

type OrderDetailsProps = {
  order: HttpTypes.StoreOrder
  showStatus?: boolean
}

const formatStatus = (str: string) => {
  const formatted = str.split("_").join(" ")
  return formatted.slice(0, 1).toUpperCase() + formatted.slice(1)
}

const StatusPill = ({ label, value }: { label: string; value: string }) => (
  <span className="inline-flex items-center gap-x-1.5 rounded-full border border-brand-green-100 bg-brand-green-50 px-3 py-1 text-caption font-medium text-brand-green-800">
    <span className="h-1.5 w-1.5 rounded-full bg-brand-green-500" />
    {label}: <span className="font-semibold">{value}</span>
  </span>
)

const InfoCell = ({
  label,
  children,
  testId,
}: {
  label: string
  children: React.ReactNode
  testId?: string
}) => (
  <div className="flex flex-col gap-y-1">
    <span className="text-caption font-semibold uppercase tracking-[0.14em] text-brand-gold-700/80">
      {label}
    </span>
    <span className="text-body-sm font-medium text-grey-90" data-testid={testId}>
      {children}
    </span>
  </div>
)

const OrderDetails = ({ order, showStatus }: OrderDetailsProps) => {
  return (
    <div className="rounded-2xl border border-grey-10 bg-white p-6 shadow-soft small:p-7">
      <div className="grid grid-cols-2 gap-5 small:grid-cols-3">
        <InfoCell label="Order number" testId="order-id">
          <span className="text-brand-green-700">#{order.display_id}</span>
        </InfoCell>
        <InfoCell label="Order date" testId="order-date">
          {new Date(order.created_at).toLocaleDateString("en-US", {
            year: "numeric",
            month: "short",
            day: "numeric",
          })}
        </InfoCell>
        <InfoCell label="Confirmation sent to" testId="order-email">
          <span className="break-all">{order.email}</span>
        </InfoCell>
      </div>

      {showStatus && (
        <div className="mt-5 flex flex-wrap items-center gap-2 border-t border-grey-10 pt-5">
          <span data-testid="order-status">
            <StatusPill
              label="Order"
              value={formatStatus(order.fulfillment_status)}
            />
          </span>
          <span data-testid="order-payment-status">
            <StatusPill
              label="Payment"
              value={formatStatus(order.payment_status)}
            />
          </span>
        </div>
      )}
    </div>
  )
}

export default OrderDetails
