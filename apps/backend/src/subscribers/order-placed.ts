import type {
  SubscriberArgs,
  SubscriberConfig,
} from "@medusajs/framework"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"
import assignOrderToDispatchWorkflow from "../workflows/assign-order-to-dispatch"

/**
 * Phase 4 — when an order is placed, attach it to today's or tomorrow's
 * dispatch batch based on the hub's 12:00 cutoff. Errors are logged but
 * not re-thrown so a Phase 4 misconfig never blocks checkout.
 */
export default async function orderPlacedHandler({
  event,
  container,
}: SubscriberArgs<{ id: string }>) {
  const logger = container.resolve(ContainerRegistrationKeys.LOGGER)
  const orderId = event.data?.id
  if (!orderId) {
    logger.warn("order.placed received without an id; skipping dispatch.")
    return
  }

  // Walk-in OTC counter sales are paid + handed over at the hub; they must never
  // join a rider dispatch batch. `createOrderWorkflow` doesn't emit `order.placed`
  // today, so this is belt-and-suspenders — but it keeps the invariant explicit
  // if order creation ever starts emitting the event.
  const query = container.resolve(ContainerRegistrationKeys.QUERY)
  const { data: metaRows } = await query.graph({
    entity: "order",
    fields: ["id", "metadata"],
    filters: { id: orderId },
  })
  const saleChannel = (
    metaRows[0] as { metadata?: { sale_channel?: string } | null } | undefined
  )?.metadata?.sale_channel
  if (saleChannel === "otc_counter") {
    logger.info(`Order ${orderId} is an OTC counter sale; skipping dispatch.`)
    return
  }

  try {
    await assignOrderToDispatchWorkflow(container).run({
      input: { order_id: orderId },
    })
    logger.info(`Order ${orderId} assigned to a dispatch batch.`)
  } catch (err) {
    logger.error(
      `Failed to assign order ${orderId} to a dispatch batch: ${
        (err as Error).message
      }`
    )
  }
}

export const config: SubscriberConfig = {
  event: "order.placed",
}
