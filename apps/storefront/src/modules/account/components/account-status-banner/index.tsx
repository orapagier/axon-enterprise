import { listCustomerDisputes } from "@lib/data/disputes"

/**
 * Status banner shown on the account pages when the customer is in a
 * non-normal accountability state (warned, prepay-locked). Server component:
 * the disputes endpoint needs the customer JWT, which only the server holds.
 */
export default async function AccountStatusBanner() {
  const { account_status: status } = await listCustomerDisputes()

  if (!status || status.state === "normal") return null

  const isPermanent = status.state === "prepay_locked_permanent"
  const isThirtyDay = status.state === "prepay_locked_30d"

  const tone = isPermanent
    ? "bg-red-50 border-red-200 text-red-900"
    : "bg-amber-50 border-amber-200 text-amber-900"

  const title = isPermanent
    ? "Permanent prepay-only"
    : isThirtyDay
      ? "30-day prepay-only period"
      : "Warning issued"

  const detail = isPermanent
    ? "Your account is in a permanent prepay-only state. COD is not available; you can still buy in person at the hub counter. Contact support to appeal."
    : isThirtyDay
      ? `COD is disabled until ${
          status.state_until
            ? new Date(status.state_until).toLocaleDateString("en-PH", {
                timeZone: "Asia/Manila",
                dateStyle: "medium",
              })
            : "the lock expires"
        }. You can still buy in person at the hub counter.`
      : "A refusal was charged to your account. Another refusal within 6 months triggers a 30-day prepay-only lock."

  return (
    <div className={`rounded-2xl border ${tone} px-4 py-3`}>
      <p className="font-semibold text-body-sm">{title}</p>
      <p className="text-caption mt-1">{detail}</p>
      <p className="text-caption mt-1">Strikes on file: {status.strike_count}</p>
    </div>
  )
}
