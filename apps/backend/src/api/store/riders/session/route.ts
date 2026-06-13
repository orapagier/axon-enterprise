import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { Modules } from "@medusajs/framework/utils"
import type { ICustomerModuleService } from "@medusajs/framework/types"
import { RIDER_MODULE } from "../../../../modules/rider"
import type RiderModuleService from "../../../../modules/rider/service"
import { signRiderToken } from "../../../../lib/rider-auth"

/**
 * GET /store/riders/session — exchange the logged-in CUSTOMER session for a
 * 30-day HS256 rider token. This is the only place a rider token is minted.
 *
 * This is how riders "log in normally on the storefront": they sign in as a
 * customer (OTP email / Google) and the storefront account area calls this to
 * unlock the /rider/* API. The link is the rider's email — set at rider
 * registration (self-signup or admin) — matched against the authenticated
 * customer's email, so no PIN or second login is involved.
 *
 * Responses:
 *  - { rider: null }                      — no rider record for this email
 *  - { rider: {...}, token: null }        — rider exists but isn't active
 *                                           (pending bond / inactive / suspended)
 *  - { rider: {...}, token: "<jwt>" }     — active rider; token works on /rider/*
 */
export async function GET(req: MedusaRequest, res: MedusaResponse) {
  const ctx = (req as unknown as { auth_context?: { actor_id?: string } })
    .auth_context
  const customerId = ctx?.actor_id
  if (!customerId) {
    res.status(401).json({ error: "Not authenticated" })
    return
  }

  const customers: ICustomerModuleService = req.scope.resolve(Modules.CUSTOMER)
  const customer = await customers.retrieveCustomer(customerId)
  const email = customer?.email?.toLowerCase()
  if (!email) {
    res.json({ rider: null })
    return
  }

  const riders: RiderModuleService = req.scope.resolve(RIDER_MODULE)
  const [rider] = await riders.listRiders({ email }, { take: 1 })
  if (!rider) {
    res.json({ rider: null })
    return
  }

  const publicRider = {
    id: rider.id,
    full_name: rider.full_name,
    phone: rider.phone,
    hub_id: rider.hub_id,
    status: rider.status,
  }

  if (rider.status !== "active") {
    res.json({ rider: publicRider, token: null })
    return
  }

  res.json({
    rider: publicRider,
    token: signRiderToken({ rider_id: rider.id, hub_id: rider.hub_id }),
  })
}
