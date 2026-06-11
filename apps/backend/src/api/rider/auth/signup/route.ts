import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { RIDER_MODULE } from "../../../../modules/rider"
import type RiderModuleService from "../../../../modules/rider/service"
import { HUB_MODULE } from "../../../../modules/hub"
import type HubModuleService from "../../../../modules/hub/service"
import { hashPin } from "../../../../modules/rider/pin"
import { verifySignupTicket } from "../../../../lib/rider-auth"

/**
 * POST /rider/auth/signup — rider self-registration (public; exempted inside
 * authenticateRider). Creates the rider as "pending": no token is issued and
 * both login rails reject pending riders until a hub admin approves them
 * (status → active) after collecting the cash bond at the counter.
 *
 * Two ways in:
 *  - Google: body carries `ticket`, the short-lived HMAC proof minted by
 *    /rider/auth/google/callback for a verified email with no rider. The
 *    email comes from the ticket, never from the client. PIN optional.
 *  - Email: body carries `email` + `pin`. The email is unverified — the
 *    admin checks identity face-to-face at bond payment — and the PIN is
 *    required since phone+PIN is the only login rail until they link Google.
 */
export async function POST(req: MedusaRequest, res: MedusaResponse) {
  const riders: RiderModuleService = req.scope.resolve(RIDER_MODULE)
  const hubs: HubModuleService = req.scope.resolve(HUB_MODULE)

  const body = (req.body ?? {}) as {
    full_name?: string
    phone?: string
    hub_id?: string
    pin?: string
    email?: string
    ticket?: string
  }

  const full_name = body.full_name?.trim()
  const phone = body.phone?.trim()
  if (!full_name || !phone || !body.hub_id) {
    res.status(400).json({ error: "full_name, phone and hub_id are required" })
    return
  }

  let email: string | null = null
  if (body.ticket) {
    const verified = verifySignupTicket(body.ticket)
    if (!verified) {
      res.status(400).json({
        error: "Your Google sign-in expired. Start again from the login page.",
      })
      return
    }
    email = verified.toLowerCase()
  } else {
    email = body.email?.trim().toLowerCase() || null
    if (!email) {
      res.status(400).json({ error: "email is required" })
      return
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      res.status(400).json({ error: "Enter a valid email address." })
      return
    }
    if (!body.pin) {
      res.status(400).json({ error: "Choose a PIN — you log in with it." })
      return
    }
  }
  if (body.pin && !/^\d{4,8}$/.test(body.pin)) {
    res.status(400).json({ error: "PIN must be 4–8 digits." })
    return
  }

  const [hub] = await hubs.listHubs(
    { id: body.hub_id, active: true },
    { take: 1 }
  )
  if (!hub) {
    res.status(400).json({ error: "Pick the hub you ride for." })
    return
  }

  const [phoneTaken] = await riders.listRiders({ phone }, { take: 1 })
  if (phoneTaken) {
    res.status(409).json({
      error: "A rider with this mobile number is already registered.",
    })
    return
  }
  const [emailTaken] = await riders.listRiders({ email }, { take: 1 })
  if (emailTaken) {
    res.status(409).json({
      error: "A rider with this email is already registered — try signing in.",
    })
    return
  }

  const rider = await riders.createRiders({
    full_name,
    phone,
    email,
    hub_id: hub.id,
    status: "pending",
    pin_hash: body.pin ? hashPin(body.pin) : null,
    notes: null,
  })

  // No token: pending riders can't act. The app shows the "pay your cash
  // bond at the hub counter" notice instead.
  res.status(201).json({
    rider: {
      id: rider.id,
      full_name: rider.full_name,
      hub_id: rider.hub_id,
      status: rider.status,
    },
  })
}
