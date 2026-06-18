import type { SubscriberArgs, SubscriberConfig } from "@medusajs/framework"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"
import { sendEmail } from "../lib/notify"
import { notifyCustomer } from "../lib/notify-customer"

/**
 * Phase B — order confirmation email on order.placed.
 *
 * Separate from the dispatch-assignment subscriber so a mail problem can never
 * interfere with batching (and vice versa). Walk-in OTC counter sales are
 * skipped: the buyer is standing at the counter holding the goods.
 *
 * Also drops the buyer's first in-app notification (header bell + inbox) so the
 * order shows up there immediately, before any dispatch/delivery updates.
 */
export default async function orderConfirmationEmailHandler({
  event,
  container,
}: SubscriberArgs<{ id: string }>) {
  const orderId = event.data?.id
  if (!orderId) return

  const query = container.resolve(ContainerRegistrationKeys.QUERY)
  const { data } = await query.graph({
    entity: "order",
    fields: [
      "id",
      "display_id",
      "email",
      "customer_id",
      "total",
      "summary.*",
      "metadata",
    ],
    filters: { id: orderId },
  })
  const order = data[0] as unknown as
    | {
        id: string
        display_id: number
        email: string | null
        customer_id: string | null
        total: number | string
        summary?: { current_order_total?: number } | null
        metadata?: {
          sale_channel?: string
          delivery_tier?: string
          delivery_fee_php?: number | string
        } | null
      }
    | undefined
  if (!order?.email) return
  if (order.metadata?.sale_channel === "otc_counter") return

  await sendEmail(container, {
    to: order.email,
    template: "order-placed",
    data: {
      display_id: order.display_id,
      total_php: Number(order.total ?? order.summary?.current_order_total ?? 0),
      delivery_tier: order.metadata?.delivery_tier ?? null,
      delivery_fee_php: Number(order.metadata?.delivery_fee_php ?? 0),
    },
  })
}

export const config: SubscriberConfig = {
  event: "order.placed",
}
