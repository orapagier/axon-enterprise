import LocalizedClientLink from "@modules/common/components/localized-client-link"
import AccountStatusBanner from "@modules/account/components/account-status-banner"
import PushOptIn from "@modules/account/components/push-opt-in"
import { convertToLocale } from "@lib/util/money"
import { hasRole } from "@lib/util/roles"
import { HttpTypes } from "@medusajs/types"

type OverviewProps = {
  customer: HttpTypes.StoreCustomer | null
  orders: HttpTypes.StoreOrder[] | null
}

const Overview = ({ customer, orders }: OverviewProps) => {
  const meta = customer?.metadata as Record<string, unknown> | null

  // Roles stack — a producer-rider gets both shortcuts.
  const roleShortcuts = [
    ...(hasRole(meta, "producer")
      ? [
          {
            href: "/account/producer",
            title: "Your listings",
            copy: "Post a harvest, update prices, and manage what's on the shelf.",
            cta: "Manage listings",
          },
        ]
      : []),
    ...(hasRole(meta, "rider")
      ? [
          {
            href: "/account/rider",
            title: "Your deliveries",
            copy: "Open your run sheet, mark stops delivered, and track the cash you hold.",
            cta: "Open run sheet",
          },
        ]
      : []),
  ]

  return (
    <div className="flex flex-col gap-y-4 small:gap-y-6" data-testid="overview-page-wrapper">
      <AccountStatusBanner />

      {/* Role shortcuts */}
      {roleShortcuts.map((roleShortcut) => (
        <LocalizedClientLink
          key={roleShortcut.href}
          href={roleShortcut.href}
          className="group bg-gradient-to-br from-brand-green-700 to-brand-green-900 rounded-3xl shadow-soft p-6 small:p-8 text-white flex flex-col xsmall:flex-row xsmall:items-center justify-between gap-4 hover:shadow-medium transition-shadow"
        >
          <div className="min-w-0">
            <h2 className="font-heading font-bold text-h2 tracking-[-0.015em]">
              {roleShortcut.title}
            </h2>
            <p className="text-body-sm text-white/70 mt-1 leading-relaxed max-w-md">
              {roleShortcut.copy}
            </p>
          </div>
          <span className="inline-flex items-center gap-x-2 px-5 py-2.5 rounded-full bg-white text-brand-green-800 text-body-sm font-bold whitespace-nowrap self-start xsmall:self-auto group-hover:bg-brand-gold-300 group-hover:text-grey-90 transition-colors">
            {roleShortcut.cta}
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="group-hover:translate-x-0.5 transition-transform">
              <line x1="5" y1="12" x2="19" y2="12" />
              <polyline points="12 5 19 12 12 19" />
            </svg>
          </span>
        </LocalizedClientLink>
      ))}

      {/* Stat cards */}
      <div className="grid grid-cols-2 gap-3 small:gap-4">
        <div className="bg-white rounded-2xl shadow-soft border border-grey-10/60 px-4 py-4 small:px-5 small:py-5">
          <div className="flex items-baseline gap-x-1.5">
            <span
              className="font-heading font-bold text-h1 text-grey-90 leading-none tabular-nums"
              data-testid="customer-profile-completion"
              data-value={getProfileCompletion(customer)}
            >
              {getProfileCompletion(customer)}%
            </span>
          </div>
          <div className="text-[10px] uppercase tracking-widest text-grey-50 font-semibold mt-1.5">
            Profile completed
          </div>
          <div className="mt-3 h-1.5 rounded-full bg-grey-10 overflow-hidden">
            <div
              className="h-full rounded-full bg-brand-green-500 transition-all duration-500"
              style={{ width: `${getProfileCompletion(customer)}%` }}
            />
          </div>
        </div>
        <div className="bg-white rounded-2xl shadow-soft border border-grey-10/60 px-4 py-4 small:px-5 small:py-5">
          <span
            className="font-heading font-bold text-h1 text-grey-90 leading-none tabular-nums"
            data-testid="addresses-count"
            data-value={customer?.addresses?.length || 0}
          >
            {customer?.addresses?.length || 0}
          </span>
          <div className="text-[10px] uppercase tracking-widest text-grey-50 font-semibold mt-1.5">
            Saved addresses
          </div>
          <LocalizedClientLink
            href="/account/addresses"
            className="inline-flex items-center gap-x-1 mt-3 text-caption font-semibold text-brand-green-700 hover:text-brand-green-800"
          >
            Manage
            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="9 18 15 12 9 6" />
            </svg>
          </LocalizedClientLink>
        </div>
      </div>

      {/* Recent orders */}
      <div className="bg-white rounded-3xl shadow-soft border border-grey-10/60 p-5 small:p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-heading font-bold text-h3 text-grey-90">
            Recent orders
          </h3>
          <LocalizedClientLink
            href="/account/orders"
            className="text-caption font-semibold text-brand-green-700 hover:text-brand-green-800"
          >
            View all
          </LocalizedClientLink>
        </div>
        <ul className="flex flex-col gap-y-2.5" data-testid="orders-wrapper">
          {orders && orders.length > 0 ? (
            orders.slice(0, 5).map((order) => (
              <li key={order.id} data-testid="order-wrapper" data-value={order.id}>
                <LocalizedClientLink
                  href={`/account/orders/details/${order.id}`}
                  className="flex items-center justify-between gap-3 rounded-2xl border border-grey-10 bg-grey-5/60 hover:bg-brand-green-50/40 hover:border-brand-green-100 px-4 py-3.5 transition-colors group"
                >
                  <div className="min-w-0">
                    <div className="flex items-center gap-x-2 flex-wrap">
                      <span
                        className="text-body-sm font-bold text-grey-90 tabular-nums"
                        data-testid="order-id"
                        data-value={order.display_id}
                      >
                        #{order.display_id}
                      </span>
                      <span
                        className="text-caption text-grey-50"
                        data-testid="order-created-date"
                      >
                        {new Date(order.created_at).toLocaleDateString("en-PH", {
                          month: "short",
                          day: "numeric",
                          year: "numeric",
                        })}
                      </span>
                    </div>
                    <span
                      className="text-caption text-grey-50 tabular-nums"
                      data-testid="order-amount"
                    >
                      {convertToLocale({
                        amount: order.total,
                        currency_code: order.currency_code,
                      })}
                    </span>
                  </div>
                  <span
                    className="shrink-0 w-8 h-8 rounded-full bg-white border border-grey-10 flex items-center justify-center text-grey-50 group-hover:text-brand-green-700 group-hover:border-brand-green-200 transition-colors"
                    data-testid="open-order-button"
                  >
                    <span className="sr-only">Go to order #{order.display_id}</span>
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="9 18 15 12 9 6" />
                    </svg>
                  </span>
                </LocalizedClientLink>
              </li>
            ))
          ) : (
            <li
              className="rounded-2xl border border-dashed border-grey-20 px-4 py-8 text-center text-body-sm text-grey-50"
              data-testid="no-orders-message"
            >
              No orders yet — your purchases will show up here.
            </li>
          )}
        </ul>
      </div>

      {/* Delivery push notifications opt-in */}
      <PushOptIn />
    </div>
  )
}

const getProfileCompletion = (customer: HttpTypes.StoreCustomer | null) => {
  let count = 0

  if (!customer) {
    return 0
  }

  if (customer.email) {
    count++
  }

  if (customer.first_name && customer.last_name) {
    count++
  }

  if (customer.phone) {
    count++
  }

  const billingAddress = customer.addresses?.find(
    (addr) => addr.is_default_billing
  )

  if (billingAddress) {
    count++
  }

  return (count / 4) * 100
}

export default Overview
