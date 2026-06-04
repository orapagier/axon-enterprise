import { isCod, isStripeLike, paymentInfoMap } from "@lib/constants"
import { convertToLocale } from "@lib/util/money"
import { HttpTypes } from "@medusajs/types"

type PaymentDetailsProps = {
  order: HttpTypes.StoreOrder
}

const Field = ({
  label,
  children,
}: {
  label: string
  children: React.ReactNode
}) => (
  <div className="flex flex-col gap-y-1">
    <span className="text-caption font-semibold uppercase tracking-[0.14em] text-brand-gold-700/80">
      {label}
    </span>
    <div className="text-body-sm leading-relaxed text-grey-70">{children}</div>
  </div>
)

const PaymentDetails = ({ order }: PaymentDetailsProps) => {
  const payment = order.payment_collections?.[0]?.payments?.[0]
  const providerId = payment?.provider_id
  const info = providerId ? paymentInfoMap[providerId] : undefined

  // COD is the launch default; treat a missing payment record as COD too.
  const cod = isCod(providerId) || !payment
  const title = info?.title ?? "Cash on Delivery"

  const deliveryFee =
    (order.metadata as { delivery_fee_php?: number } | null)
      ?.delivery_fee_php ?? 0
  const goodsTotal = payment?.amount ?? order.total ?? 0
  const dueOnDelivery = goodsTotal + (cod ? deliveryFee : 0)

  const cardLast4 = (
    payment?.data as { card_last4?: string } | null | undefined
  )?.card_last4

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
            <rect x="2" y="5" width="20" height="14" rx="2" />
            <line x1="2" y1="10" x2="22" y2="10" />
          </svg>
        </span>
        <h2 className="font-heading text-h3 text-grey-90">Payment</h2>
      </div>

      <div className="flex flex-col gap-y-5">
        <Field label="Method">
          <div className="flex items-center gap-x-2">
            {info?.icon && (
              <span className="flex h-7 w-fit items-center rounded-base bg-grey-5 p-1.5 ring-1 ring-grey-10">
                {info.icon}
              </span>
            )}
            <span
              className="font-medium text-grey-90"
              data-testid="payment-method"
            >
              {title}
            </span>
          </div>
        </Field>

        <Field label={cod ? "Amount due on delivery" : "Amount paid"}>
          <span
            className="text-body font-semibold text-grey-90"
            data-testid="payment-amount"
          >
            {isStripeLike(providerId) && payment?.data?.card_last4
              ? `•••• •••• •••• ${payment.data.card_last4}`
              : convertToLocale({
                  amount: dueOnDelivery,
                  currency_code: order.currency_code,
                })}
          </span>
          {cod ? (
            <p className="mt-1.5 text-caption text-grey-50">
              Please prepare cash for our rider.
              {deliveryFee > 0 &&
                ` Includes ${convertToLocale({
                  amount: deliveryFee,
                  currency_code: order.currency_code,
                })} delivery fee.`}
            </p>
          ) : (
            payment?.created_at && (
              <p className="mt-1.5 text-caption text-grey-50">
                Paid on {new Date(payment.created_at).toLocaleString()}
              </p>
            )
          )}
        </Field>
      </div>
    </section>
  )
}

export default PaymentDetails
