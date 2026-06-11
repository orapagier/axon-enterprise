import { retrieveCustomer } from "@lib/data/customer"
import {
  getRiderManifest,
  getRiderSession,
  getRiderSummary,
} from "@lib/data/rider"
import { listHubs } from "@modules/hub/data/hubs"
import RiderDashboard from "@modules/account/components/rider-dashboard"
import RiderRegisterForm from "@modules/account/components/rider-dashboard/register-form"
import { Metadata } from "next"
import { notFound, redirect } from "next/navigation"

export const metadata: Metadata = {
  title: "Deliveries | Mindanao Fresh Hub",
  description: "Your delivery run sheet on Mindanao Fresh Hub.",
}

// The manifest and cash summary must never be served stale.
export const dynamic = "force-dynamic"

type Props = {
  params: Promise<{ countryCode: string }>
}

export default async function RiderDeliveriesPage({ params }: Props) {
  const { countryCode } = await params
  const customer = await retrieveCustomer()

  if (!customer) {
    redirect(`/${countryCode}/account`)
  }

  const meta = (customer.metadata ?? {}) as Record<string, unknown>
  const session = await getRiderSession()

  // Reachable by rider-typed accounts, and by any account the hub admin
  // registered as a rider (matched on email) even if its account_type drifted.
  if (meta.account_type !== "rider" && !session.rider) {
    notFound()
  }

  const displayName =
    customer.first_name ||
    (customer.email ? customer.email.split("@")[0] : "rider")

  const hubs = await listHubs()
  const hub = session.rider
    ? hubs.find((h) => h.id === session.rider!.hub_id)
    : null
  const hubLabel = hub ? hub.name : "hub"

  // ── Not registered yet: offer in-account registration ──────────────────
  if (!session.rider) {
    return (
      <div className="bg-white rounded-3xl shadow-soft border border-grey-10/60 p-6 small:p-8">
        <span className="text-[10px] font-bold text-grey-50 uppercase tracking-[0.18em]">
          Rider registration
        </span>
        <h1 className="font-heading font-bold text-h1 text-grey-90 mt-2 tracking-[-0.02em]">
          Ride for the hub, {displayName}
        </h1>
        <p className="text-body-sm text-grey-50 mt-2 max-w-lg leading-relaxed">
          Deliver orders for your city&apos;s hub and earn per delivery.
          Register below with the same email you use to sign in — once you pay
          the cash bond at the hub counter, the dispatcher activates you and
          your run sheet appears right here.
        </p>
        <RiderRegisterForm
          hubs={hubs.map((h) => ({ id: h.id, name: h.name, city: h.city }))}
        />
      </div>
    )
  }

  // ── Registered but not active ───────────────────────────────────────────
  if (session.rider.status === "pending") {
    return (
      <div className="bg-white rounded-3xl shadow-soft border border-grey-10/60 p-8 small:p-10 text-center">
        <div className="mx-auto w-14 h-14 rounded-2xl bg-brand-gold-50 border border-brand-gold-200 flex items-center justify-center text-2xl mb-4">
          ⏳
        </div>
        <h1 className="font-heading font-bold text-h2 text-grey-90">
          Registration received
        </h1>
        <p className="text-body-sm text-grey-50 mt-2 max-w-md mx-auto leading-relaxed">
          Your rider account is waiting for hub approval. Pay your{" "}
          <b className="text-grey-80">cash bond at the {hubLabel} counter</b>{" "}
          and the dispatcher will activate you — your delivery run sheet then
          shows up on this page.
        </p>
      </div>
    )
  }

  if (!session.token) {
    return (
      <div className="bg-white rounded-3xl shadow-soft border border-red-100 p-8 small:p-10 text-center">
        <div className="mx-auto w-14 h-14 rounded-2xl bg-red-50 border border-red-200 flex items-center justify-center text-2xl mb-4">
          ⚠️
        </div>
        <h1 className="font-heading font-bold text-h2 text-grey-90">
          Rider account {session.rider.status}
        </h1>
        <p className="text-body-sm text-grey-50 mt-2 max-w-md mx-auto leading-relaxed">
          {session.rider.status === "suspended"
            ? "Your rider account is suspended — usually for unremitted COD cash. Settle up at the hub counter to get reinstated."
            : "Your rider account is inactive. Visit the hub counter or contact your dispatcher."}
        </p>
      </div>
    )
  }

  // ── Active rider: live run sheet ────────────────────────────────────────
  const [stops, summary] = await Promise.all([
    getRiderManifest(session.token),
    getRiderSummary(session.token),
  ])

  return (
    <div className="flex flex-col gap-y-4 small:gap-y-6">
      <div className="bg-white rounded-3xl shadow-soft border border-grey-10/60 p-6 small:p-8">
        <div className="flex items-center gap-x-2.5">
          <span className="text-[10px] font-bold text-grey-50 uppercase tracking-[0.18em]">
            Run sheet · {hubLabel}
          </span>
          <span className="inline-flex items-center gap-x-1 px-2 py-0.5 rounded-full bg-brand-green-50 text-brand-green-700 text-[10px] font-bold uppercase tracking-wider border border-brand-green-100">
            <span className="w-1.5 h-1.5 rounded-full bg-brand-green-500 animate-pulse" />
            Active
          </span>
        </div>
        <h1 className="font-heading font-bold text-h1 small:text-display text-grey-90 leading-[1.05] tracking-[-0.02em] mt-2">
          {session.rider.full_name || displayName}
          <span className="text-brand-green-600">.</span>
        </h1>
        <p className="text-body-sm text-grey-50 mt-2 leading-relaxed">
          {stops.length > 0
            ? `${stops.length} ${stops.length === 1 ? "stop" : "stops"} on your sheet. Mark each one delivered as you collect the cash — delivered is not remitted, so drop the cash at the counter before the limit.`
            : "Nothing on your sheet right now. Stops appear here the moment your batch is dispatched."}
        </p>
      </div>

      <RiderDashboard stops={stops} summary={summary} hubLabel={hubLabel} />
    </div>
  )
}
