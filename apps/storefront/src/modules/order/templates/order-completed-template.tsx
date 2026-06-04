import { cookies as nextCookies } from "next/headers"

import CartTotals from "@modules/common/components/cart-totals"
import LocalizedClientLink from "@modules/common/components/localized-client-link"
import DispatchEstimate from "@modules/order/components/dispatch-estimate"
import Help from "@modules/order/components/help"
import Items from "@modules/order/components/items"
import OnboardingCta from "@modules/order/components/onboarding-cta"
import OrderDetails from "@modules/order/components/order-details"
import ShippingDetails from "@modules/order/components/shipping-details"
import PaymentDetails from "@modules/order/components/payment-details"
import { HttpTypes } from "@medusajs/types"

type OrderCompletedTemplateProps = {
  order: HttpTypes.StoreOrder
}

export default async function OrderCompletedTemplate({
  order,
}: OrderCompletedTemplateProps) {
  const cookies = await nextCookies()

  const isOnboarding = cookies.get("_medusa_onboarding")?.value === "true"

  const firstName = order.shipping_address?.first_name

  return (
    <div className="relative min-h-[calc(100vh-68px)] bg-grey-5/40">
      {/* Ambient farm-fresh wash behind the hero */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 h-[420px] bg-gradient-to-b from-brand-green-50 via-brand-cream-50/50 to-transparent"
      />

      <div className="relative content-container">
        <div className="mx-auto flex w-full max-w-3xl flex-col gap-y-8 py-10 small:py-16">
          {isOnboarding && <OnboardingCta orderId={order.id} />}

          {/* ── Hero ─────────────────────────────────────────────── */}
          <div
            className="flex flex-col items-center text-center gap-y-5"
            data-testid="order-complete-container"
          >
            <div className="relative flex items-center justify-center">
              <span className="absolute inset-0 rounded-full bg-brand-green-300/40 blur-2xl" />
              <span className="relative flex h-20 w-20 items-center justify-center rounded-full bg-gradient-green shadow-medium ring-1 ring-brand-green-800/30">
                <span className="absolute inset-0 rounded-full ring-4 ring-white/40" />
                <svg
                  width="36"
                  height="36"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="white"
                  strokeWidth="3"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="relative drop-shadow-sm"
                >
                  <polyline points="20 6 9 17 4 12" />
                </svg>
              </span>
            </div>

            <div className="flex flex-col items-center gap-y-2.5">
              <span className="inline-flex items-center gap-x-2 text-caption font-semibold uppercase tracking-[0.22em] text-brand-gold-700">
                <span className="h-px w-5 bg-brand-gold-400" />
                Order confirmed
                <span className="h-px w-5 bg-brand-gold-400" />
              </span>
              <h1 className="font-heading text-[34px] leading-[1.05] tracking-[-0.01em] text-grey-90 small:text-display">
                Thank you{firstName ? `, ${firstName}` : ""}!
              </h1>
              <p className="max-w-md text-body text-grey-60">
                Your order is confirmed and headed for our hub. We&apos;ll keep
                it fresh and get it moving — a confirmation is on its way to your
                inbox.
              </p>
            </div>
          </div>

          {/* ── Order meta ───────────────────────────────────────── */}
          <OrderDetails order={order} />

          {/* ── Delivery estimate ────────────────────────────────── */}
          <DispatchEstimate placedAt={order.created_at} />

          {/* ── Summary card ─────────────────────────────────────── */}
          <section className="overflow-hidden rounded-2xl border border-grey-10 bg-white shadow-soft">
            <div className="flex items-center gap-x-3 border-b border-grey-10 px-6 py-5 small:px-8">
              <span className="h-6 w-1 rounded-full bg-brand-gold-400" />
              <h2 className="font-heading text-h2 text-grey-90">
                Order summary
              </h2>
            </div>
            <div className="px-6 py-2 small:px-8">
              <Items order={order} />
            </div>
            <div className="border-t border-grey-10 bg-brand-cream-50/40 px-6 py-6 small:px-8">
              <CartTotals totals={order} />
            </div>
          </section>

          {/* ── Shipping + Payment ───────────────────────────────── */}
          <div className="grid grid-cols-1 gap-4 small:grid-cols-2">
            <ShippingDetails order={order} />
            <PaymentDetails order={order} />
          </div>

          {/* ── CTAs ─────────────────────────────────────────────── */}
          <div className="flex flex-col items-center justify-center gap-3 pt-1 xsmall:flex-row">
            <LocalizedClientLink
              href="/store"
              className="inline-flex h-11 w-full items-center justify-center gap-x-2 rounded-full bg-brand-green-700 px-6 font-semibold text-white shadow-soft ring-1 ring-brand-green-800/40 transition-all hover:bg-brand-green-800 xsmall:w-auto"
            >
              Continue shopping
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
            <LocalizedClientLink
              href="/account/orders"
              className="inline-flex h-11 w-full items-center justify-center rounded-full border border-grey-20 bg-white px-6 font-medium text-grey-90 transition-all hover:bg-grey-5 xsmall:w-auto"
            >
              Track your order
            </LocalizedClientLink>
          </div>

          <Help />
        </div>
      </div>
    </div>
  )
}
