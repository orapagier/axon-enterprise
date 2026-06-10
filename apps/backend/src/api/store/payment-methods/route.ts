import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import {
  ACCOUNTABILITY_MODULE,
  PREPAY_LOCKED_STATES,
} from "../../../modules/accountability"
import type AccountabilityModuleService from "../../../modules/accountability/service"

/**
 * GET /store/payment-methods
 *
 * Returns the online payment eligibility for the current buyer at checkout.
 *
 * Reframe 2026-06-10: OTC is **walk-in only**, not an online payment method, so
 * it is no longer offered here. The only online method is COD, which is hidden
 * for buyers in a `prepay_locked_*` accountability state (after repeated
 * refusals). A locked buyer therefore has **no online method** — checkout is
 * blocked and they are told to buy in person at the hub (OTC counter).
 *
 * Guests (no customer session) get COD; strikes are keyed on a customer id, so
 * an anonymous cart can't be locked.
 *
 * The storefront uses this to render the right state. `payment-cod` also
 * enforces the lock at `authorizePayment` as a safety net, so a stale UI can
 * never actually push a locked buyer through COD.
 */
type AccountState =
  | "normal"
  | "warned"
  | "prepay_locked_30d"
  | "prepay_locked_permanent"

export async function GET(req: MedusaRequest, res: MedusaResponse) {
  const customerId =
    (req as unknown as { auth_context?: { actor_id?: string } }).auth_context
      ?.actor_id ?? null

  let accountState: AccountState = "normal"

  if (customerId) {
    const accountability: AccountabilityModuleService =
      req.scope.resolve(ACCOUNTABILITY_MODULE)
    const [status] = await accountability.listBuyerAccountStatuses(
      { customer_id: customerId },
      { take: 1 }
    )
    if (status?.state) {
      accountState = status.state as AccountState
    }
  }

  const codLocked = PREPAY_LOCKED_STATES.has(accountState)
  const codReason = !codLocked
    ? null
    : accountState === "prepay_locked_permanent"
      ? "Your account is in a permanent prepay-only state due to repeated refusals. Please pay at the hub counter (OTC)."
      : "Your account is in a 30-day prepay-only period due to a prior refusal. Please pay at the hub counter (OTC)."

  res.json({
    customer_id: customerId,
    account_state: accountState,
    cod_available: !codLocked,
    methods: [
      {
        id: "pp_cod_freshhub",
        type: "cod",
        label: "Cash on Delivery",
        available: !codLocked,
        reason_if_unavailable: codReason,
      },
      {
        id: "pp_otc_freshhub",
        type: "otc",
        label: "Over the Counter (pay at hub)",
        available: true,
        reason_if_unavailable: null,
      },
    ],
  })
}
