/**
 * Phase E smoke-test helper (temporary; safe to delete).
 *   STATUS=active|suspended npx medusa exec ./src/scripts/rider-smoke-rider2.ts
 * Creates/updates a SECOND rider (phone 09170000002, PIN 4321) at the Tagum hub
 * with the given status, for ownership + suspended-login negative tests.
 */
import { ExecArgs } from "@medusajs/framework/types"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"
import { RIDER_MODULE } from "../modules/rider"
import type RiderModuleService from "../modules/rider/service"
import { hashPin } from "../modules/rider/pin"

const HUB_ID = "01KS4TYKE280NSH40MSEN5QV9J"
const PHONE = "09170000002"
const PIN = "4321"

export default async function setup({ container }: ExecArgs) {
  const logger = container.resolve(ContainerRegistrationKeys.LOGGER)
  const riders: RiderModuleService = container.resolve(RIDER_MODULE)
  const status = (process.env.STATUS as "active" | "suspended") || "active"

  let [rider] = await riders.listRiders({ phone: PHONE }, { take: 1 })
  if (!rider) {
    rider = await riders.createRiders({
      full_name: "Pedro Santos",
      phone: PHONE,
      hub_id: HUB_ID,
      status,
      pin_hash: hashPin(PIN),
      notes: "smoke-test rider 2",
    })
  } else {
    rider = await riders.updateRiders({ id: rider.id, status, pin_hash: hashPin(PIN) })
  }
  logger.info(`RIDER2 ${JSON.stringify({ id: rider.id, phone: PHONE, pin: PIN, status: rider.status })}`)
}
