import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { ContainerRegistrationKeys, Modules } from "@medusajs/framework/utils"
import { DELIVERY_FEES_MODULE } from "../../../../modules/delivery-fees"
import type DeliveryFeesModuleService from "../../../../modules/delivery-fees/service"
import { resolveHubForDelivery } from "../../../../lib/resolve-hub"
import {
  parseHHMM,
  beforeCutoff,
  isMembershipActive,
  isWithinDeliveryHours,
  resolveDeliveryWindow,
  feeForTier,
  type DeliveryTier as Tier,
} from "../../../../lib/delivery-tiers"
import { nowInTimezone } from "../../../../lib/hub-time"

const VALID_TIERS: Tier[] = ["free", "standard", "special"]

/**
 * POST /store/delivery-options/select
 * Body: { cart_id, tier }
 *
 * Re-runs eligibility (server-side, never trust the client) and writes the
 * chosen tier + computed fee to cart.metadata. The dispatch system reads
 * delivery_tier off the order at order-placement time.
 *
 * Note (MVP): the actual fee is captured in cart.metadata.delivery_fee_php
 * and does NOT yet flow into Medusa's shipping_total — the buyer pays it in
 * cash on delivery (COD-only at launch). When online payments are added,
 * this endpoint must also call addShippingMethodToCartWorkflow with the
 * computed amount.
 */
export async function POST(req: MedusaRequest, res: MedusaResponse) {
  const body = req.body as { cart_id?: string; tier?: string }
  if (!body.cart_id) {
    res.status(400).json({ error: "cart_id is required" })
    return
  }
  if (!body.tier || !VALID_TIERS.includes(body.tier as Tier)) {
    res.status(400).json({
      error: `tier must be one of ${VALID_TIERS.join(", ")}`,
    })
    return
  }
  const tier = body.tier as Tier

  const query = req.scope.resolve(ContainerRegistrationKeys.QUERY)
  const cartModule = req.scope.resolve(Modules.CART)
  const feesService: DeliveryFeesModuleService = req.scope.resolve(
    DELIVERY_FEES_MODULE
  )

  const { data: carts } = await query.graph({
    entity: "cart",
    fields: [
      "id",
      "customer_id",
      "shipping_address.city",
      "shipping_address.metadata",
    ],
    filters: { id: body.cart_id },
  })
  const cart = carts[0] as
    | {
        id: string
        customer_id: string | null
        shipping_address: {
          city: string | null
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
  if (!barangay) {
    res.status(400).json({
      error: "cart shipping_address.metadata.barangay must be set first",
    })
    return
  }

  // Same hub-local rule as GET /store/delivery-options: home hub wins and
  // the address must be inside its city.
  const resolution = await resolveHubForDelivery(req.scope, {
    customerId: cart.customer_id,
    city: cart.shipping_address?.city,
  })
  if (!resolution.ok) {
    res.status(resolution.status).json({ error: resolution.error })
    return
  }
  const hub = resolution.hub

  const fee = await feesService.retrieveByHubBarangay(hub.id, barangay)
  if (!fee) {
    res.status(404).json({
      error: `delivery to ${barangay} not yet supported by ${hub.name}`,
    })
    return
  }

  // Current hub-local time, reused by the operating-hours gate and the
  // Free-tier cutoff check below.
  const now = nowInTimezone(hub.timezone)

  // Operating-hours gate: nothing dispatches outside the hub's window,
  // regardless of tier.
  const window = resolveDeliveryWindow(hub.delivery_open, hub.delivery_close)
  if (!isWithinDeliveryHours(now, window.open, window.close)) {
    res.status(409).json({
      error: `Delivery is only available ${window.label}`,
    })
    return
  }

  // Re-check Special eligibility (Hub Member gate).
  if (tier === "special") {
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
    if (!isMember) {
      res.status(403).json({
        error: "Special delivery requires Hub Member status",
      })
      return
    }
  }

  // Re-check Free eligibility (before cutoff).
  if (tier === "free") {
    if (!beforeCutoff(now, parseHHMM(hub.dispatch_cutoff))) {
      res.status(409).json({
        error: `Free delivery requires order before ${hub.dispatch_cutoff} ${hub.timezone}`,
      })
      return
    }
  }

  const feePhp = feeForTier(tier, fee.standard_fee_php, fee.special_fee_php)

  // Merge into cart metadata.
  const [updated] = await cartModule.updateCarts([
    {
      id: cart.id,
      metadata: {
        delivery_tier: tier,
        delivery_fee_php: feePhp,
        delivery_hub_id: hub.id,
        delivery_hub_slug: hub.slug,
        delivery_barangay: barangay,
      },
    },
  ])

  res.json({
    cart_id: updated.id,
    delivery_tier: tier,
    delivery_fee_php: feePhp,
    delivery_hub_slug: hub.slug,
    delivery_barangay: barangay,
  })
}
