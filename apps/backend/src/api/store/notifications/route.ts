import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { CUSTOMER_NOTIFICATION_MODULE } from "../../../modules/customer-notification"
import type CustomerNotificationModuleService from "../../../modules/customer-notification/service"

function getCustomerId(req: MedusaRequest): string | null {
  const ctx = (req as unknown as { auth_context?: { actor_id?: string } })
    .auth_context
  return ctx?.actor_id ?? null
}

/**
 * GET /store/notifications — this customer's in-app notifications.
 *
 * Returns the latest 50 (newest first) plus `unread_count` for the header
 * bell's badge. `?unread=true` narrows the list to unread only (what the
 * hover dropdown shows). Scoped to the signed-in customer via auth_context, so
 * a user can only ever read their own feed.
 */
export async function GET(req: MedusaRequest, res: MedusaResponse) {
  const customerId = getCustomerId(req)
  if (!customerId) {
    res.status(401).json({ error: "Not authenticated" })
    return
  }

  const service: CustomerNotificationModuleService = req.scope.resolve(
    CUSTOMER_NOTIFICATION_MODULE
  )

  const filters: Record<string, unknown> = { customer_id: customerId }
  if (req.query.unread === "true") {
    filters.read_at = null
  }

  const notifications = await service.listCustomerNotifications(filters, {
    order: { created_at: "DESC" },
    take: 50,
  })

  const [, unread_count] = await service.listAndCountCustomerNotifications(
    { customer_id: customerId, read_at: null },
    { take: 1 }
  )

  res.json({ notifications, unread_count })
}
