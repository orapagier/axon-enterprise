import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { RIDER_MODULE } from "../../../../modules/rider"
import type RiderModuleService from "../../../../modules/rider/service"
import { verifyPin } from "../../../../modules/rider/pin"
import { signRiderToken } from "../../../../lib/rider-auth"

/**
 * POST /rider/auth/login
 * Body: { phone, pin }  →  { token, rider }
 *
 * Public (no auth). Returns a 30-day rider token to use as
 * `Authorization: Bearer <token>` on the rest of /rider/*.
 */
export async function POST(req: MedusaRequest, res: MedusaResponse) {
  const { phone, pin } = (req.body ?? {}) as { phone?: string; pin?: string }
  if (!phone || !pin) {
    res.status(400).json({ error: "phone and pin are required" })
    return
  }

  const riders: RiderModuleService = req.scope.resolve(RIDER_MODULE)
  const [rider] = await riders.listRiders({ phone }, { take: 1 })

  // Same response for unknown phone and wrong PIN — don't leak which.
  if (!rider || !verifyPin(pin, rider.pin_hash)) {
    res.status(401).json({ error: "Invalid phone or PIN" })
    return
  }
  if (rider.status !== "active") {
    res.status(403).json({
      error: `Your rider account is ${rider.status}. Contact your hub.`,
    })
    return
  }

  const token = signRiderToken({ rider_id: rider.id, hub_id: rider.hub_id })
  res.json({
    token,
    rider: {
      id: rider.id,
      full_name: rider.full_name,
      hub_id: rider.hub_id,
      status: rider.status,
    },
  })
}
