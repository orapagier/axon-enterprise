import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { CUSTOMER_NOTIFICATION_MODULE } from "../../../../modules/customer-notification"
import type CustomerNotificationModuleService from "../../../../modules/customer-notification/service"

function getCustomerId(req: MedusaRequest): string | null {
  const ctx = (req as unknown as { auth_context?: { actor_id?: string } })
    .auth_context
  return ctx?.actor_id ?? null
}

/**
 * POST /store/notifications/read-all — mark every unread notification read.
 */
export async function POST(req: MedusaRequest, res: MedusaResponse) {
  const customerId = getCustomerId(req)
  if (!customerId) {
    res.status(401).json({ error: "Not authenticated" })
    return
  }

  const service: CustomerNotificationModuleService = req.scope.resolve(
    CUSTOMER_NOTIFICATION_MODULE
  )

  const unread = (await service.listCustomerNotifications(
    { customer_id: customerId, read_at: null },
    { take: 1000, select: ["id"] }
  )) as { id: string }[]

  if (unread.length) {
    const read_at = new Date()
    await service.updateCustomerNotifications(
      unread.map((n) => ({ id: n.id, read_at }))
    )
  }

  res.json({ ok: true, marked: unread.length })
}
