import { retrieveCustomer } from "@lib/data/customer"
import { Metadata } from "next"
import { notFound, redirect } from "next/navigation"

export const metadata: Metadata = {
  title: "Rider dashboard",
  description: "Manage your deliveries and earnings on Mindanao Fresh Hub.",
}

type Props = {
  params: Promise<{ countryCode: string }>
}

export default async function RiderDashboardPage({ params }: Props) {
  const { countryCode } = await params
  const customer = await retrieveCustomer()

  if (!customer) {
    redirect(`/${countryCode}/account`)
  }

  const meta = (customer.metadata ?? {}) as Record<string, unknown>
  if (meta.account_type !== "rider") {
    notFound()
  }

  const isAvailable = meta.rider_available === true
  const displayName =
    customer.first_name ||
    (customer.email ? customer.email.split("@")[0] : "rider")

  return (
    <div className="flex flex-col gap-y-6">
      {/* Header card */}
      <div className="bg-white rounded-3xl shadow-soft border border-grey-10/60 p-6 small:p-8">
        <div className="flex flex-col xsmall:flex-row xsmall:items-end justify-between gap-4">
          <div>
            <div className="flex items-center gap-x-2.5 mb-2">
              <span className="text-[10px] font-bold text-grey-50 uppercase tracking-[0.18em]">
                Rider dashboard
              </span>
              {isAvailable ? (
                <span className="inline-flex items-center gap-x-1 px-2 py-0.5 rounded-full bg-brand-green-50 text-brand-green-700 text-[10px] font-bold uppercase tracking-wider border border-brand-green-100">
                  <span className="w-1.5 h-1.5 rounded-full bg-brand-green-500 animate-pulse" />
                  Available
                </span>
              ) : (
                <span className="inline-flex items-center gap-x-1 px-2 py-0.5 rounded-full bg-grey-100 text-grey-60 text-[10px] font-bold uppercase tracking-wider border border-grey-200">
                  Offline
                </span>
              )}
            </div>
            <h1 className="font-heading font-bold text-h1 small:text-display text-grey-90 leading-[1.05] tracking-[-0.02em]">
              {displayName}
              <span className="text-brand-green-600">.</span>
            </h1>
            <p className="text-body-sm text-grey-50 mt-2 leading-relaxed">
              {isAvailable
                ? "You&apos;re available for deliveries. Orders will be routed to you based on your area."
                : "Toggle your availability to start receiving delivery requests."}
            </p>
          </div>

          {/* Stats */}
          <div />
        </div>

        {/* Stat row */}
        <div className="mt-6 grid grid-cols-3 gap-3 small:gap-4">
          <div className="rounded-2xl border border-grey-10 bg-grey-5 px-4 py-3">
            <div className="font-heading font-bold text-h1 text-grey-90 leading-none tabular-nums">
              —
            </div>
            <div className="text-[10px] uppercase tracking-widest text-grey-50 font-semibold mt-1.5">
              Today
            </div>
          </div>
          <div className="rounded-2xl border border-brand-green-200 bg-brand-green-50/30 px-4 py-3">
            <div className="font-heading font-bold text-h1 text-brand-green-700 leading-none tabular-nums">
              —
            </div>
            <div className="text-[10px] uppercase tracking-widest text-brand-green-800 font-semibold mt-1.5">
              This week
            </div>
          </div>
          <div className="rounded-2xl border border-grey-10 bg-white px-4 py-3">
            <div className="font-heading font-bold text-h1 text-grey-90 leading-none tabular-nums">
              —
            </div>
            <div className="text-[10px] uppercase tracking-widest text-grey-50 font-semibold mt-1.5">
              Earnings
            </div>
          </div>
        </div>
      </div>

      {/* Pending deliveries placeholder */}
      <div className="bg-white rounded-3xl border border-dashed border-grey-20 p-10 text-center">
        <div className="text-4xl mb-3">🛵</div>
        <div className="font-heading font-bold text-h2 text-grey-90 tracking-[-0.015em]">
          No active deliveries
        </div>
        <p className="text-body-sm text-grey-50 mt-2 max-w-md mx-auto">
          When a customer chooses standard delivery and you&apos;re the nearest
          available rider, the order will appear here.
        </p>
        <div className="mt-6 inline-flex items-center gap-x-2 px-5 py-2.5 rounded-full bg-brand-green-50 border border-brand-green-200 text-[11px] text-brand-green-700 font-semibold uppercase tracking-wider">
          <svg
            width="12"
            height="12"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
            <path d="M7 11V7a5 5 0 0 1 10 0v4" />
          </svg>
          How it works
        </div>
        <div className="mt-4 max-w-sm mx-auto text-left space-y-3 text-caption text-grey-50">
          <div className="flex items-start gap-x-2">
            <span className="w-5 h-5 rounded-full bg-brand-green-600 text-white flex items-center justify-center text-[10px] font-bold shrink-0 mt-0.5">1</span>
            <span>Customers choose &quot;Standard delivery&quot; at checkout.</span>
          </div>
          <div className="flex items-start gap-x-2">
            <span className="w-5 h-5 rounded-full bg-brand-green-600 text-white flex items-center justify-center text-[10px] font-bold shrink-0 mt-0.5">2</span>
            <span>Orders are routed to the nearest available rider in the hub area.</span>
          </div>
          <div className="flex items-start gap-x-2">
            <span className="w-5 h-5 rounded-full bg-brand-green-600 text-white flex items-center justify-center text-[10px] font-bold shrink-0 mt-0.5">3</span>
            <span>Deliver and earn — you keep 100% of the delivery fee.</span>
          </div>
        </div>
      </div>
    </div>
  )
}