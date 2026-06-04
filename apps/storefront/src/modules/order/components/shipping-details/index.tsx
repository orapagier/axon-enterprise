import { convertToLocale } from "@lib/util/money"
import { HttpTypes } from "@medusajs/types"

type ShippingDetailsProps = {
  order: HttpTypes.StoreOrder
}

const TIER_LABELS: Record<string, string> = {
  free: "Free delivery",
  standard: "Standard delivery",
  special: "Special delivery",
}

const Field = ({
  label,
  children,
  testId,
}: {
  label: string
  children: React.ReactNode
  testId?: string
}) => (
  <div className="flex flex-col gap-y-1" data-testid={testId}>
    <span className="text-caption font-semibold uppercase tracking-[0.14em] text-brand-gold-700/80">
      {label}
    </span>
    <div className="text-body-sm leading-relaxed text-grey-70">{children}</div>
  </div>
)

const ShippingDetails = ({ order }: ShippingDetailsProps) => {
  // Delivery in this checkout is captured as a tier in order.metadata (the fee
  // is paid COD), not as a Medusa shipping_method — so shipping_methods is
  // usually empty. Read the tier/fee from metadata, falling back to a real
  // shipping method for any legacy orders that used one.
  const meta = (order.metadata ?? {}) as {
    delivery_tier?: string
    delivery_fee_php?: number
  }
  const shippingMethod = order.shipping_methods?.[0] as
    | { name?: string; total?: number }
    | undefined

  const methodName =
    (meta.delivery_tier ? TIER_LABELS[meta.delivery_tier] : undefined) ??
    shippingMethod?.name ??
    "Delivery"
  const methodAmount = meta.delivery_fee_php ?? shippingMethod?.total ?? 0

  const addr = order.shipping_address
  const barangay = (addr?.metadata as { barangay?: string } | undefined)
    ?.barangay

  return (
    <section className="flex h-full flex-col rounded-2xl border border-grey-10 bg-white p-6 shadow-soft small:p-7">
      <div className="mb-5 flex items-center gap-x-2.5">
        <span className="flex h-8 w-8 items-center justify-center rounded-full bg-brand-green-50 text-brand-green-700 ring-1 ring-brand-green-100">
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
            <circle cx="12" cy="10" r="3" />
          </svg>
        </span>
        <h2 className="font-heading text-h3 text-grey-90">Delivery</h2>
      </div>

      <div className="flex flex-col gap-y-5">
        <Field label="Ship to" testId="shipping-address-summary">
          <span className="font-medium text-grey-90">
            {addr?.first_name} {addr?.last_name}
          </span>
          <br />
          {addr?.address_1}
          {addr?.address_2 ? `, ${addr.address_2}` : ""}
          {barangay ? (
            <>
              <br />
              Brgy. {barangay}
            </>
          ) : null}
          <br />
          {[addr?.postal_code, addr?.city].filter(Boolean).join(", ")}
          {addr?.country_code ? `, ${addr.country_code.toUpperCase()}` : ""}
        </Field>

        <Field label="Contact" testId="shipping-contact-summary">
          {addr?.phone && (
            <>
              {addr.phone}
              <br />
            </>
          )}
          {order.email}
        </Field>

        <Field label="Method" testId="shipping-method-summary">
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
            <span className="font-medium text-grey-90">{methodName}</span>
            {methodAmount > 0 ? (
              <span className="text-grey-50">
                {convertToLocale({
                  amount: methodAmount,
                  currency_code: order.currency_code,
                })}
              </span>
            ) : (
              <span className="rounded-full border border-brand-green-100 bg-brand-green-50 px-2 py-0.5 text-caption font-semibold text-brand-green-700">
                Free
              </span>
            )}
          </div>
        </Field>
      </div>
    </section>
  )
}

export default ShippingDetails
