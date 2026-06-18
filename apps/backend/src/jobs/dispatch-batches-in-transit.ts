/**
 * Flip locked dispatch batches to in_transit at each hub's dispatch_time
 * (default 16:00 local). Runs every 15 minutes; for every locked batch whose
 * hub dispatch_time has been reached on its dispatch_date, transition to
 * in_transit and stamp dispatched_at.
 *
 * Run on-demand with:
 *   npx medusa exec ./src/jobs/dispatch-batches-in-transit.ts
 */
import type { MedusaContainer } from "@medusajs/framework/types"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"
import { DISPATCH_MODULE } from "../modules/dispatch"
import type DispatchModuleService from "../modules/dispatch/service"
import { HUB_MODULE } from "../modules/hub"
import type HubModuleService from "../modules/hub/service"
import { sendEmail } from "../lib/notify"
import { notifyCustomer } from "../lib/notify-customer"
import { runJob, type JobInput } from "../lib/job-observability"

export const config = {
  name: "dispatch-batches-in-transit",
  schedule: "*/15 * * * *",
}

const MANILA_OFFSET_MS = 8 * 60 * 60_000

function parseHHmm(s: string): { h: number; m: number } {
  const [h, m] = s.split(":").map((x) => parseInt(x, 10))
  return { h: h ?? 0, m: m ?? 0 }
}

async function dispatchBatchesInTransit(container: MedusaContainer) {
  const logger = container.resolve(ContainerRegistrationKeys.LOGGER)
  const dispatchService: DispatchModuleService =
    container.resolve(DISPATCH_MODULE)
  const hubService: HubModuleService = container.resolve(HUB_MODULE)

  const now = new Date()
  const locked = await dispatchService.listDispatchBatches(
    { status: "locked" },
    { take: 500 }
  )
  if (!locked.length) {
    logger.info("dispatch-batches-in-transit: no locked batches.")
    return
  }

  const hubIds = Array.from(new Set(locked.map((b) => b.hub_id)))
  const hubs = await hubService.listHubs({ id: hubIds }, { take: hubIds.length })
  const hubById = new Map(hubs.map((h) => [h.id, h]))

  let transitioned = 0
  for (const batch of locked) {
    const hub = hubById.get(batch.hub_id)
    if (!hub) continue
    const { h, m } = parseHHmm(hub.dispatch_time ?? "16:00")
    const date =
      typeof batch.dispatch_date === "string"
        ? new Date(batch.dispatch_date)
        : batch.dispatch_date
    const dispatchAtUtcMs =
      Date.UTC(
        date.getUTCFullYear(),
        date.getUTCMonth(),
        date.getUTCDate(),
        h,
        m
      ) - MANILA_OFFSET_MS
    if (dispatchAtUtcMs <= now.getTime()) {
      await dispatchService.updateDispatchBatches({
        id: batch.id,
        status: "in_transit",
        dispatched_at: now,
      })
      transitioned++
      logger.info(
        `Dispatch batch ${batch.id} (hub ${batch.hub_id}) → in_transit`
      )
      await notifyBatchInTransit(container, batch.id)
    }
  }

  logger.info(
    `dispatch-batches-in-transit finished: ${transitioned} batches transitioned.`
  )
}

/**
 * Phase B — "your order is on the way" email to every pending order in a batch
 * that just went out. Best-effort per recipient; a mail failure never blocks
 * the batch transition (sendEmail swallows + logs).
 */
async function notifyBatchInTransit(
  container: MedusaContainer,
  batchId: string
) {
  const dispatchService: DispatchModuleService =
    container.resolve(DISPATCH_MODULE)
  const query = container.resolve(ContainerRegistrationKeys.QUERY)

  const dispatchOrders = await dispatchService.listDispatchOrders(
    { dispatch_batch_id: batchId, delivery_status: "pending" },
    { take: 200 }
  )
  if (!dispatchOrders.length) return

  const { data: orders } = await query.graph({
    entity: "order",
    fields: ["id", "display_id", "email", "customer_id"],
    filters: { id: dispatchOrders.map((o) => o.order_id) },
  })
  for (const order of orders as unknown as {
    id: string
    display_id: number
    email: string | null
    customer_id: string | null
  }[]) {
    await sendEmail(container, {
      to: order.email,
      template: "order-in-transit",
      data: { display_id: order.display_id },
    })
    await notifyCustomer(container, {
      customerId: order.customer_id,
      type: "delivery",
      title: "Out for delivery 🛵",
      body: `Your order #${order.display_id} is on the way.`,
      url: "/account/orders",
      tag: `order-${order.id}`,
    })
  }
}

export default (input: JobInput) =>
  runJob("dispatch-batches-in-transit", input, dispatchBatchesInTransit)
