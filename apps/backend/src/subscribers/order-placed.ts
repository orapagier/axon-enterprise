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
