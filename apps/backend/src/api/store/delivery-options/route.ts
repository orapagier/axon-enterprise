import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"
import { DELIVERY_FEES_MODULE } from "../../../modules/delivery-fees"
import type DeliveryFeesModuleService from "../../../modules/delivery-fees/service"
import { resolveHubForDelivery } from "../../../lib/resolve-hub"
import {
  parseHHMM,
  beforeCutoff,
  isMembershipActive,
  isWithinDeliveryHours,
  resolveDeliveryWindow,
  buildDeliveryTiers,
  resolveCartDeliveryEligibility,
  type CartItemDeliveryMeta,
} from "../../../lib/delivery-tiers"
import { nowInTimezone } from "../../../lib/hub-time"

/**
 * GET /store/delivery-options?cart_id=X
 *
 * Returns the 3 delivery tiers (Free / Standard / Special) for the cart's
 * shipping address. Each tier reports its fee, ETA, availability, and the
 * reason it's unavailable (if any). The UI renders all 3 always and disables
 * the unavailable ones with the reason.
 *
 * Required: cart must have a shipping_address with metadata.barangay set.
 * Hub is resolved from cart shipping_address.city for now (Tagum-only launch).
 */
export async function GET(req: MedusaRequest, res: MedusaResponse) {
  const cartId = req.query.cart_id as string | undefined
  if (!cartId) {
    res.status(400).json({ error: "cart_id is required" })
    return
  }

  const query = req.scope.resolve(ContainerRegistrationKeys.QUERY)
  const feesService: DeliveryFeesModuleService = req.scope.resolve(
    DELIVERY_FEES_MODULE
  )

  // 1. Load cart with shipping address + line items (for who-sells-what).
  const { data: carts } = await query.graph({
    entity: "cart",
    fields: [
      "id",
      "customer_id",
      "shipping_address.city",
      "shipping_address.province",
      "shipping_address.metadata",
      "items.product_id",
    ],
    filters: { id: cartId },
  })
  const cart = carts[0] as
    | {
        id: string
        customer_id: string | null
        items: { product_id: string | null }[] | null
        shipping_address: {
          city: string | null
          province: string | null
          metadata: Record<string, unknown> | null
        } | null
      }
    | undefined

  if (!cart) {
    res.status(404).json({ error: "cart not found" })
    return
  }

  const barangay =
    (cart.shipping_address?.metadata?.barangay as string | undefined)?.trim() ??
    ""
  if (!cart.shipping_address || !barangay) {
    res.status(400).json({
      error: "shipping_address with metadata.barangay is required",
      options: [],
    })
    return
  }

  // 2. Resolve hub. Operations are hub-local by design (per-city hubs): a
  //    customer's home hub wins and the address must be inside its city;
  //    guests match an active hub by city.
  const resolution = await resolveHubForDelivery(req.scope, {
    customerId: cart.customer_id,
    city: cart.shipping_address.city,
  })
  if (!resolution.ok) {
    res.status(resolution.status).json({
      error: resolution.error,
      ...(resolution.hint ? { hint: resolution.hint } : {}),
      options: [],
    })
    return
  }
  const hub = resolution.hub

  // 3. Lookup fees for (hub, barangay).
  const fee = await feesService.retrieveByHubBarangay(hub.id, barangay)
  if (!fee) {
    res.status(404).json({
      error: `delivery to ${barangay} not yet supported by ${hub.name}`,
      options: [],
    })
    return
  }

  // 4. Member status (from customer metadata).
  let isMember = false
  if (cart.customer_id) {
    const { data: customers } = await query.graph({
      entity: "customer",
      fields: ["id", "metadata"],
      filters: { id: cart.customer_id },
    })
    const cust = customers[0] as
      | { metadata: Record<string, unknown> | null }
      | undefined
    // Active AND unexpired — the nightly expiry job cancels stale members,
    // but the tier gate must not honor an expiry the job hasn't reached yet.
    isMember = isMembershipActive(cust?.metadata, Date.now())
  }

  // 5. Time of day vs cutoff + the hub's operating-hours window (hub-local).
  const now = nowInTimezone(hub.timezone)
  const cutoff = parseHHMM(hub.dispatch_cutoff)
  const isBeforeCutoff = beforeCutoff(now, cutoff)
  const window = resolveDeliveryWindow(hub.delivery_open, hub.delivery_close)
  const isOpen = isWithinDeliveryHours(now, window.open, window.close)
  const cutoffLabel = hub.dispatch_cutoff
  const dispatchLabel = hub.dispatch_time

  // 6. Build the 3 tier options.
  const options = buildDeliveryTiers({
    standardFeePhp: fee.standard_fee_php,
    specialFeePhp: fee.special_fee_php,
    isMember,
    isBeforeCutoff,
    isOpen,
    hoursLabel: window.label,
    dispatchLabel,
    cutoffLabel,
  })

  res.json({
    hub: { id: hub.id, slug: hub.slug, name: hub.name },
    barangay,
    is_member: isMember,
    now: { hour: now.hour, minute: now.minute, timezone: hub.timezone },
    cutoff: hub.dispatch_cutoff,
    is_open: isOpen,
    hours_label: window.label,
    options,
  })
}
