import { completeCartWorkflow } from "@medusajs/medusa/core-flows"
import {
  ContainerRegistrationKeys,
  MedusaError,
} from "@medusajs/framework/utils"
import type { MedusaContainer } from "@medusajs/framework/types"
import {
  ACCOUNTABILITY_MODULE,
  PREPAY_LOCKED_STATES,
} from "../../modules/accountability"
import type AccountabilityModuleService from "../../modules/accountability/service"
import { resolveHubForDelivery } from "../../lib/resolve-hub"
import {
  isWithinDeliveryHours,
  resolveDeliveryWindow,
} from "../../lib/delivery-tiers"
import { nowInTimezone } from "../../lib/hub-time"

/**
 * Server-side gates at cart completion. The storefront pre-checks these in the
 * delivery step, but completion is the authoritative point — a stale cart (e.g.
 * the delivery window closed while the buyer sat on the review page) must not
 * slip an order through.
 *
 * 1. Operating-hours gate — the buyer's hub only delivers inside its configured
 *    window; outside it, no order can be placed (applies to guests too).
 * 2. Prepay-lock gate — a `prepay_locked_*` buyer cannot complete ANY online
 *    checkout (they buy in person at the OTC counter). This hook — not the COD
 *    provider's authorizePayment — is the enforcement, because workflow hooks
 *    run in the main container where the accountability module resolves;
 *    payment providers run in the payment module's isolated container, which
 *    cannot resolve custom modules (the provider's check is best-effort only —
 *    see payment-cod/service.ts).
 */
completeCartWorkflow.hooks.validate(
  async ({ cart }, { container }) => {
    await assertWithinDeliveryHours(cart as { id: string }, container)

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

/**
 * Block completion when the buyer's hub is outside its operating window.
 *
 * Resolves the hub the same way the delivery-options endpoints do (home hub, or
 * city match). If a hub can't be resolved (no address / unserved city), this
 * gate stays silent — that's a different validation's job; here we only stop an
 * order that lands on a hub which is currently closed.
 */
async function assertWithinDeliveryHours(
  cart: { id: string },
  container: MedusaContainer
): Promise<void> {
  const query = container.resolve(ContainerRegistrationKeys.QUERY)
  const { data: carts } = await query.graph({
    entity: "cart",
    fields: ["id", "customer_id", "shipping_address.city"],
    filters: { id: cart.id },
  })
  const c = carts[0] as
    | { customer_id: string | null; shipping_address: { city: string | null } | null }
    | undefined

  const resolution = await resolveHubForDelivery(container, {
    customerId: c?.customer_id ?? null,
    city: c?.shipping_address?.city,
  })
  if (!resolution.ok) return
  const hub = resolution.hub

  const window = resolveDeliveryWindow(hub.delivery_open, hub.delivery_close)
  const now = nowInTimezone(hub.timezone)
  if (!isWithinDeliveryHours(now, window.open, window.close)) {
    throw new MedusaError(
      MedusaError.Types.NOT_ALLOWED,
      `${hub.name} only delivers ${window.label}. Please place your order during delivery hours.`
    )
  }
}
