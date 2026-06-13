import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { PUSH_NOTIFICATION_MODULE } from "../../../../modules/push-notification"
import type PushNotificationModuleService from "../../../../modules/push-notification/service"

/**
 * POST /store/push/subscribe   — save (upsert by endpoint) the caller's Web
 *                                Push subscription so delivery notifications
 *                                can reach this device.
 * DELETE /store/push/subscribe — remove a subscription by endpoint (the user
 *                                turned notifications off / unsubscribed).
 *
 * Customer-authenticated (see api/middlewares.ts `/store/push*`). The
 * subscription is bound to the signed-in customer; the browser mints the
 * endpoint + encryption keys via PushManager.subscribe.
 */

type IncomingSub = {
  endpoint?: string
  keys?: { p256dh?: string; auth?: string }
}

function customerId(req: MedusaRequest): string | null {
  return (
    (req as unknown as { auth_context?: { actor_id?: string } }).auth_context
      ?.actor_id ?? null
  )
}

export async function POST(req: MedusaRequest, res: MedusaResponse) {
  const id = customerId(req)
  if (!id) {
    res.status(401).json({ error: "Not authenticated" })
    return
  }

  const body = (req.body ?? {}) as {
    subscription?: IncomingSub
    user_agent?: string | null
  }
  const sub = body.subscription
  const endpoint = sub?.endpoint
  const p256dh = sub?.keys?.p256dh
  const auth = sub?.keys?.auth
  if (!endpoint || !p256dh || !auth) {
    res
      .status(400)
      .json({ error: "subscription.endpoint and keys (p256dh, auth) are required" })
    return
  }

  const service: PushNotificationModuleService = req.scope.resolve(
    PUSH_NOTIFICATION_MODULE
  )

  const userAgent =
    typeof body.user_agent === "string" ? body.user_agent.slice(0, 255) : null

  // Upsert by endpoint: a returning device re-subscribes with the same
  // endpoint; rebind it to this customer and refresh the keys.
  const [existing] = await service.listPushSubscriptions({ endpoint }, { take: 1 })
  if (existing) {
    await service.updatePushSubscriptions({
      id: existing.id,
      customer_id: id,
      p256dh,
      auth,
      user_agent: userAgent,
    })
  } else {
    await service.createPushSubscriptions({
      customer_id: id,
      endpoint,
      p256dh,
      auth,
      user_agent: userAgent,
    })
  }

  res.json({ ok: true })
}

export async function DELETE(req: MedusaRequest, res: MedusaResponse) {
  const id = customerId(req)
  if (!id) {
    res.status(401).json({ error: "Not authenticated" })
    return
  }

  const endpoint = ((req.body ?? {}) as { endpoint?: string }).endpoint
  if (!endpoint) {
    res.status(400).json({ error: "endpoint is required" })
    return
  }

  const service: PushNotificationModuleService = req.scope.resolve(
    PUSH_NOTIFICATION_MODULE
  )
  // Only delete the caller's own subscription for that endpoint.
  const rows = await service.listPushSubscriptions(
    { endpoint, customer_id: id },
    { take: 1 }
  )
  if (rows.length) {
    await service.deletePushSubscriptions(rows.map((r) => r.id))
  }

  res.json({ ok: true })
}
