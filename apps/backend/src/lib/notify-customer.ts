import type { MedusaContainer } from "@medusajs/framework/types"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"
import { sendPush, type PushMessage } from "./push"
import { CUSTOMER_NOTIFICATION_MODULE } from "../modules/customer-notification"
import type CustomerNotificationModuleService from "../modules/customer-notification/service"

export type CustomerNotificationInput = PushMessage & {
  // Coarse category the storefront uses for the icon/colour.
  type?: string
  // Optional structured payload (kept for future detail rendering).
  data?: Record<string, unknown> | null
}

/**
 * Tell a customer something happened: persist an in-app notification (header
 * bell + /account/notifications inbox) AND fire the matching Web Push, from one
 * call site so the two never drift.
 *
 * Both halves are best-effort and isolated: the inbox write is wrapped so a DB
 * hiccup can't break the business flow, and the push runs regardless of whether
 * the write succeeded — exactly the guarantees sendPush/sendEmail already give.
 *
 * When `tag` is set, an existing UNREAD notification with the same
 * (customer_id, tag) is updated in place instead of stacking duplicates, so a
 * job that nudges the same order repeatedly leaves a single fresh inbox item.
 */
export async function notifyCustomer(
  container: MedusaContainer,
  input: CustomerNotificationInput
): Promise<void> {
  const { customerId, title, body, url, tag, type, data } = input

  if (customerId) {
    try {
      const service: CustomerNotificationModuleService = container.resolve(
        CUSTOMER_NOTIFICATION_MODULE
      )

      let existing: { id: string }[] = []
      if (tag) {
        existing = (await service.listCustomerNotifications(
          { customer_id: customerId, tag, read_at: null },
          { select: ["id"] }
        )) as { id: string }[]
      }

      // Collapse repeats by REPLACING the stale unread row(s), not updating in
      // place: an update keeps the original created_at, so a just-changed item
      // (e.g. an order moving "received" → "out for delivery") would show a
      // stale timestamp and stay buried below newer notifications. Dropping +
      // recreating gives it a fresh created_at so it bubbles to the top of the
      // inbox/dropdown (both sort by created_at DESC) with a current time.
      if (existing.length) {
        await service.deleteCustomerNotifications(existing.map((e) => e.id))
      }
      await service.createCustomerNotifications({
        customer_id: customerId,
        title,
        body,
        url: url ?? null,
        tag: tag ?? null,
        type: type ?? null,
        data: data ?? null,
      })
    } catch (err) {
      try {
        container
          .resolve(ContainerRegistrationKeys.LOGGER)
          .warn(`notifyCustomer persist failed: ${(err as Error).message}`)
      } catch {
        /* logger unavailable */
      }
    }
  }

  // Push is purely additive — its absence must never skip the inbox row above.
  await sendPush(container, { customerId, title, body, url, tag })
}
