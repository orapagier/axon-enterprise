import type { MedusaContainer } from "@medusajs/framework/types"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"
import webpush from "web-push"
import {
  PUSH_NOTIFICATION_MODULE,
} from "../modules/push-notification"
import type PushNotificationModuleService from "../modules/push-notification/service"

/**
 * Best-effort Web Push (Phase B, the optional push half of notifications).
 *
 * Mirrors src/lib/notify.ts: a push hiccup can never break a business flow —
 * delivery confirmation, in-transit, and order-placed all proceed even if the
 * push fails. Without VAPID keys configured this no-ops + warns once, exactly
 * like the email provider without RESEND_API_KEY.
 *
 * Subscriptions that the browser has dropped (404/410) are pruned on send, so
 * the table self-heals without a cron job.
 */

let configured: boolean | null = null

/** Configure web-push from env once. Returns whether push is usable. */
function ensureConfigured(container: MedusaContainer): boolean {
  if (configured !== null) return configured

  const publicKey =
    process.env.VAPID_PUBLIC_KEY ?? process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY
  const privateKey = process.env.VAPID_PRIVATE_KEY
  const subject = process.env.VAPID_SUBJECT ?? "mailto:support@freshhub.canchowlung.com"

  if (!publicKey || !privateKey) {
    configured = false
    try {
      container
        .resolve(ContainerRegistrationKeys.LOGGER)
        .warn(
          "Web Push disabled: set VAPID_PUBLIC_KEY + VAPID_PRIVATE_KEY (+ optional VAPID_SUBJECT) to enable."
        )
    } catch {
      /* logger unavailable */
    }
    return false
  }

  webpush.setVapidDetails(subject, publicKey, privateKey)
  configured = true
  return true
}

export type PushMessage = {
  customerId: string | null | undefined
  title: string
  body: string
  // Path the notification opens (storefront-relative, e.g. /account/orders).
  url?: string
  // Stable tag so repeat notifications for the same order collapse.
  tag?: string
}

export async function sendPush(
  container: MedusaContainer,
  msg: PushMessage
): Promise<void> {
  if (!msg.customerId) return
  if (!ensureConfigured(container)) return

  try {
    const service: PushNotificationModuleService = container.resolve(
      PUSH_NOTIFICATION_MODULE
    )
    const subs = await service.listPushSubscriptions(
      { customer_id: msg.customerId },
      { take: 50 }
    )
    if (!subs.length) return

    const payload = JSON.stringify({
      title: msg.title,
      body: msg.body,
      url: msg.url ?? "/account/orders",
      tag: msg.tag,
    })

    const dead: string[] = []
    await Promise.all(
      subs.map(async (s) => {
        try {
          await webpush.sendNotification(
            {
              endpoint: s.endpoint,
              keys: { p256dh: s.p256dh, auth: s.auth },
            },
            payload
          )
        } catch (err) {
          const statusCode = (err as { statusCode?: number }).statusCode
          // 404/410 = the browser dropped this subscription; prune it.
          if (statusCode === 404 || statusCode === 410) {
            dead.push(s.id)
          } else {
            try {
              container
                .resolve(ContainerRegistrationKeys.LOGGER)
                .warn(`Push to ${s.endpoint.slice(0, 40)}… failed: ${(err as Error).message}`)
            } catch {
              /* logger unavailable */
            }
          }
        }
      })
    )

    if (dead.length) {
      await service.deletePushSubscriptions(dead)
    }
  } catch (err) {
    try {
      container
        .resolve(ContainerRegistrationKeys.LOGGER)
        .warn(`sendPush failed: ${(err as Error).message}`)
    } catch {
      /* logger unavailable */
    }
  }
}
