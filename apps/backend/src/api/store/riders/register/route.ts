import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { Modules } from "@medusajs/framework/utils"
import type { ICustomerModuleService } from "@medusajs/framework/types"
import { RIDER_MODULE } from "../../../../modules/rider"
import type RiderModuleService from "../../../../modules/rider/service"
import { HUB_MODULE } from "../../../../modules/hub"
import type HubModuleService from "../../../../modules/hub/service"

/**
 * POST /store/riders/register — rider self-registration from the storefront
 * account area. Body: { full_name, phone, hub_id }.
 *
 * The email comes from the AUTHENTICATED customer (already verified by the
 * OTP / Google sign-in rails), never from the body — same trust model as the
 * Google signup ticket on the public POST /rider/auth/signup. No PIN: the
 * storefront session, exchanged at GET /store/riders/session, replaces the
 * phone+PIN rail. The rider lands as "pending" and is activated by a hub
 * admin after the cash bond is paid at the counter.
 */
export async function POST(req: MedusaRequest, res: MedusaResponse) {
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
    res.status(400).json({ error: "Your account has no email address." })
    return
  }

  const body = (req.body ?? {}) as {
    full_name?: string
    phone?: string
    hub_id?: string
  }
  const full_name = body.full_name?.trim()
  const phone = body.phone?.trim()
  if (!full_name || !phone || !body.hub_id) {
    res.status(400).json({ error: "full_name, phone and hub_id are required" })
    return
  }
  if (!/^(\+?63|0)9\d{9}$/.test(phone.replace(/[\s-]/g, ""))) {
    res.status(400).json({
      error: "Enter a valid PH mobile number (09xx xxx xxxx).",
    })
    return
  }

  const hubs: HubModuleService = req.scope.resolve(HUB_MODULE)
  const [hub] = await hubs.listHubs(
    { id: body.hub_id, active: true },
    { take: 1 }
  )
  if (!hub) {
    res.status(400).json({ error: "Pick the hub you ride for." })
    return
  }

  const riders: RiderModuleService = req.scope.resolve(RIDER_MODULE)
  const [emailTaken] = await riders.listRiders({ email }, { take: 1 })
  if (emailTaken) {
    res.status(409).json({
      error: "A rider is already registered with this email.",
    })
    return
  }
  const [phoneTaken] = await riders.listRiders({ phone }, { take: 1 })
  if (phoneTaken) {
    res.status(409).json({
      error: "A rider with this mobile number is already registered.",
    })
    return
  }

  const rider = await riders.createRiders({
    full_name,
    phone,
    email,
    hub_id: hub.id,
    status: "pending",
    pin_hash: null,
    notes: null,
  })

  res.status(201).json({
    rider: {
      id: rider.id,
      full_name: rider.full_name,
      phone: rider.phone,
      hub_id: rider.hub_id,
      status: rider.status,
    },
  })
}
