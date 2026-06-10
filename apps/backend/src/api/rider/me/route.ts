import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { RIDER_MODULE } from "../../../modules/rider"
import type RiderModuleService from "../../../modules/rider/service"
import { getRiderId } from "../../../lib/rider-auth"

/**
 * GET /rider/me — the logged-in rider's profile.
 */
export async function GET(req: MedusaRequest, res: MedusaResponse) {
  const riderId = getRiderId(req)
  const riders: RiderModuleService = req.scope.resolve(RIDER_MODULE)
  const [rider] = await riders.listRiders({ id: riderId }, { take: 1 })
  if (!rider) {
    res.status(404).json({ error: "Rider not found" })
    return
  }
  res.json({
    rider: {
      id: rider.id,
      full_name: rider.full_name,
      phone: rider.phone,
      hub_id: rider.hub_id,
      status: rider.status,
    },
  })
}
