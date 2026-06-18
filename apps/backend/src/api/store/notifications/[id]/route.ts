import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { CUSTOMER_NOTIFICATION_MODULE } from "../../../../modules/customer-notification"
import type CustomerNotificationModuleService from "../../../../modules/customer-notification/service"

function getCustomerId(req: MedusaRequest): string | null {
  const ctx = (req as unknown as { auth_context?: { actor_id?: string } })
    .auth_context
  return ctx?.actor_id ?? null
}

async function loadOwned(
  req: MedusaRequest,
  res: MedusaResponse
): Promise<{
  service: CustomerNotificationModuleService
  notification: Record<string, unknown>
} | null> {
  const customerId = getCustomerId(req)
  if (!customerId) {
    res.status(401).json({ error: "Not authenticated" })
    return null
  }
  const service: CustomerNotificationModuleService = req.scope.resolve(
    CUSTOMER_NOTIFICATION_MODULE
  )
  // Filter by customer_id too — never let one customer read another's row by id.
  const [notification] = await service.listCustomerNotifications(
    { id: req.params.id, customer_id: customerId },
    { take: 1 }
  )
  if (!notification) {
    res.status(404).json({ error: "Not found" })
    return null
  }
  return { service, notification: notification as Record<string, unknown> }
}

/**
 * GET /store/notifications/:id — the full notification, marked read as a side
 * effect (opening the detail page is what "reads" it).
 */
export async function GET(req: MedusaRequest, res: MedusaResponse) {
  const owned = await loadOwned(req, res)
  if (!owned) return
  const { service, notification } = owned

  if (!notification.read_at) {
    const read_at = new Date()
    await service.updateCustomerNotifications({
      id: notification.id as string,
      read_at,
    })
    notification.read_at = read_at
  }

  res.json({ notification })
}

/**
 * POST /store/notifications/:id — explicitly mark one notification read.
 */
export async function POST(req: MedusaRequest, res: MedusaResponse) {
  const owned = await loadOwned(req, res)
  if (!owned) return
  const { service, notification } = owned

  if (!notification.read_at) {
    const read_at = new Date()
    await service.updateCustomerNotifications({
      id: notification.id as string,
      read_at,
    })
    notification.read_at = read_at
  }

  res.json({ notification })
}
