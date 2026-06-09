import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import {
  ACCOUNTABILITY_MODULE,
  PREPAY_LOCKED_STATES,
} from "../../../modules/accountability"
import type AccountabilityModuleService from "../../../modules/accountability/service"

/**
 * GET /store/payment-methods
 *
 * Returns the payment methods available to the current buyer at checkout.
 *
 * - COD is hidden for buyers in a `prepay_locked_*` accountability state (after
 *   repeated refusals). They keep access to the store but must pay OTC.
 * - OTC (walk-in, pay at the hub counter) is always available — it is the cash
 *   prepay rail, so no online/PayMongo integration is needed at launch.
 *
 * Guests (no customer session) get both methods; strikes are keyed on a
 * customer id, so an anonymous cart can't be locked.
 *
 * The storefront uses this to render the right options. `payment-cod` also
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
