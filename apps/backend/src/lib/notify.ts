import type { MedusaContainer } from "@medusajs/framework/types"
import {
  ContainerRegistrationKeys,
  Modules,
} from "@medusajs/framework/utils"

/**
 * Best-effort transactional email (Phase B).
 *
 * Wraps the Notification module so callers never crash a business flow over a
 * mail hiccup: checkout, delivery confirmation, dispute handling, and
 * membership actions all proceed even if the email fails — the failure is
 * logged instead. Channel is always "email" (Resend provider).
 */
export async function sendEmail(
  container: MedusaContainer,
  args: { to: string | null | undefined; template: string; data?: Record<string, unknown> }
): Promise<void> {
  if (!args.to) return
  try {
    const notifications = container.resolve(Modules.NOTIFICATION)
    await notifications.createNotifications([
      {
        to: args.to,
        channel: "email",
        template: args.template,
        data: args.data ?? {},
      },
    ])
  } catch (err) {
    try {
      const logger = container.resolve(ContainerRegistrationKeys.LOGGER)
      logger.warn(
        `Email "${args.template}" to ${args.to} failed: ${(err as Error).message}`
      )
    } catch {
      // even the logger is unavailable — drop silently
    }
  }
}
