import { completeCartWorkflow } from "@medusajs/medusa/core-flows"
import { MedusaError } from "@medusajs/framework/utils"
import {
  ACCOUNTABILITY_MODULE,
  PREPAY_LOCKED_STATES,
} from "../../modules/accountability"
import type AccountabilityModuleService from "../../modules/accountability/service"

/**
 * Authoritative prepay-lock gate at cart completion.
 *
 * This hook — not the COD provider's authorizePayment — is the server-side
 * enforcement that a `prepay_locked_*` buyer cannot complete ANY online
 * checkout (they buy in person at the OTC counter instead). It lives here
 * because workflow hooks run in the main container where the accountability
 * module resolves; payment providers run in the payment module's isolated
 * container, which cannot resolve custom modules (the provider's check is
 * best-effort only — see payment-cod/service.ts).
 */
completeCartWorkflow.hooks.validate(
  async ({ cart }, { container }) => {
    const customerId =
      (cart as { customer?: { id?: string | null } | null }).customer?.id ??
      (cart as { customer_id?: string | null }).customer_id ??
      null
    if (!customerId) return // guest checkout; strikes are keyed on customer id

    const accountability: AccountabilityModuleService = container.resolve(
      ACCOUNTABILITY_MODULE
    )
    const [status] = await accountability.listBuyerAccountStatuses(
      { customer_id: customerId },
      { take: 1 }
    )
    if (status && PREPAY_LOCKED_STATES.has(status.state)) {
      throw new MedusaError(
        MedusaError.Types.NOT_ALLOWED,
        status.state === "prepay_locked_permanent"
          ? "Your account is restricted from online ordering due to repeated refusals. Please buy in person at the hub counter."
          : "Your account is restricted from online ordering due to a prior refusal. Please buy in person at the hub counter."
      )
    }
  }
)
