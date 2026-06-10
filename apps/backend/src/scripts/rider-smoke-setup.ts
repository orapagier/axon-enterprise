/**
 * Phase E rider smoke-test SETUP (temporary; safe to delete).
 *
 *   npx medusa exec ./src/scripts/rider-smoke-setup.ts
 *
 * Idempotent. Creates:
 *  - a test rider (phone 09171234567, PIN 1234, active) at the Tagum hub
 *  - a `locked` dispatch batch for that hub
 *  - a dispatch_order linking the existing COD order (display_id 2) to the
 *    batch, assigned to the rider, delivery_status=pending
 *
 * Prints the ids needed to drive POST /rider/auth/login → GET /rider/manifest
 * → POST /rider/orders/:id/delivered.
 */
import { ExecArgs } from "@medusajs/framework/types"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"
import { RIDER_MODULE } from "../modules/rider"
import type RiderModuleService from "../modules/rider/service"
import { DISPATCH_MODULE } from "../modules/dispatch"
import type DispatchModuleService from "../modules/dispatch/service"
import { hashPin } from "../modules/rider/pin"

const HUB_ID = "01KS4TYKE280NSH40MSEN5QV9J"
const COD_ORDER_ID = "order_01KT95V8VRG8H6NW3AD1AVFX4V"
const PHONE = "09171234567"
const PIN = "1234"

export default async function setup({ container }: ExecArgs) {
  const logger = container.resolve(ContainerRegistrationKeys.LOGGER)
  const riders: RiderModuleService = container.resolve(RIDER_MODULE)
  const dispatch: DispatchModuleService = container.resolve(DISPATCH_MODULE)

  // 1. Rider (idempotent on phone)
  let [rider] = await riders.listRiders({ phone: PHONE }, { take: 1 })
  if (!rider) {
    rider = await riders.createRiders({
      full_name: "Juan Dela Cruz",
      phone: PHONE,
      hub_id: HUB_ID,
      status: "active",
      pin_hash: hashPin(PIN),
      notes: "smoke-test rider",
    })
  } else if (rider.status !== "active" || !rider.pin_hash) {
    rider = await riders.updateRiders({
      id: rider.id,
      status: "active",
      pin_hash: hashPin(PIN),
    })
  }

  // 2. Locked dispatch batch for the hub (reuse one if it already exists)
  let [batch] = await dispatch.listDispatchBatches(
    { hub_id: HUB_ID, status: "locked" },
    { take: 1 }
  )
  if (!batch) {
    batch = await dispatch.createDispatchBatches({
      hub_id: HUB_ID,
      dispatch_date: new Date(),
      cutoff_at: new Date(),
      status: "locked",
    })
  }

  // 3. dispatch_order for the COD order, assigned to the rider, pending
  let [dispatchOrder] = await dispatch.listDispatchOrders(
    { order_id: COD_ORDER_ID },
    { take: 1 }
  )
  if (!dispatchOrder) {
    dispatchOrder = await dispatch.createDispatchOrders({
      order_id: COD_ORDER_ID,
      rider_id: rider.id,
      manifest_position: 1,
      delivery_status: "pending",
      dispatch_batch: batch.id,
    })
  } else {
    dispatchOrder = await dispatch.updateDispatchOrders({
      id: dispatchOrder.id,
      rider_id: rider.id,
      delivery_status: "pending",
      delivered_at: null,
      dispatch_batch: batch.id,
    })
  }

  logger.info(
    `SMOKE_SETUP_RESULT ${JSON.stringify({
      rider_id: rider.id,
      rider_phone: PHONE,
      rider_pin: PIN,
      batch_id: batch.id,
      batch_status: batch.status,
      dispatch_order_id: dispatchOrder.id,
      order_id: COD_ORDER_ID,
    })}`
  )
}
