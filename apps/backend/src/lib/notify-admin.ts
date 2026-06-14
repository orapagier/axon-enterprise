import type { MedusaContainer } from "@medusajs/framework/types"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"

/**
 * Best-effort admin Telegram notifications.
 *
 * Mirrors src/lib/notify.ts (email) and src/lib/push.ts (web push): a Telegram
 * hiccup can never break a business flow — rider signup, listing submission,
 * checkout, dispute handling and the nightly cron jobs all proceed even if the
 * ping fails (it is logged instead). Without TELEGRAM_BOT_TOKEN +
 * TELEGRAM_ADMIN_CHAT_ID configured this no-ops + warns once, exactly like the
 * email provider without RESEND_API_KEY and push without VAPID keys.
 *
 * One bot fans every "thing the admin needs to know" into the founder's chat:
 *   - action queue  — new rider, new listing, dispute opened, buyer appeal,
 *                     membership payment to verify, urgent (special) delivery
 *   - nightly flags — disputes past SLA, riders suspended, membership
 *                     downgrades, expired pickup windows
 *
 * Set TELEGRAM_ADMIN_CHAT_ID to a comma-separated list to fan out to several
 * chats (e.g. a personal DM + an ops group). Optional ADMIN_PUBLIC_URL turns
 * the `url` path into a clickable link to the admin panel.
 */

export type AdminMessage = {
  title: string
  // Detail lines rendered under the title, one per line. Falsy entries dropped
  // so callers can inline conditionals (`cond && "line"`).
  lines?: (string | null | undefined | false)[]
  // Admin-panel-relative path the event concerns, e.g. "/app/riders".
  url?: string
}

/**
 * Pure message formatter — exported for unit tests. Plain text (no Markdown) so
 * there is nothing to escape; `baseUrl` (ADMIN_PUBLIC_URL) is passed in rather
 * than read from env to keep this deterministic.
 */
export function formatAdminMessage(msg: AdminMessage, baseUrl?: string): string {
  const parts: string[] = [msg.title]
  for (const line of msg.lines ?? []) {
    if (line) parts.push(line)
  }
  if (msg.url) {
    const trimmed = baseUrl?.replace(/\/+$/, "")
    parts.push(trimmed ? `${trimmed}${msg.url}` : msg.url)
  }
  return parts.join("\n")
}

let configured: boolean | null = null

/** Parsed, trimmed, non-empty chat ids from TELEGRAM_ADMIN_CHAT_ID. */
function chatIds(): string[] {
  return (process.env.TELEGRAM_ADMIN_CHAT_ID ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean)
}

/** Check env once. Returns whether Telegram is usable; warns once if not. */
function ensureConfigured(container: MedusaContainer): boolean {
  if (configured !== null) return configured

  const token = process.env.TELEGRAM_BOT_TOKEN
  if (!token || chatIds().length === 0) {
    configured = false
    try {
      container
        .resolve(ContainerRegistrationKeys.LOGGER)
        .warn(
          "Admin Telegram disabled: set TELEGRAM_BOT_TOKEN + TELEGRAM_ADMIN_CHAT_ID to enable."
        )
    } catch {
      /* logger unavailable */
    }
    return false
  }
  configured = true
  return true
}

export async function notifyAdmin(
  container: MedusaContainer,
  msg: AdminMessage
): Promise<void> {
  if (!ensureConfigured(container)) return

  const token = process.env.TELEGRAM_BOT_TOKEN as string
  const ids = chatIds()
  const text = formatAdminMessage(msg, process.env.ADMIN_PUBLIC_URL)

  try {
    await Promise.all(
      ids.map(async (chatId) => {
        const resp = await fetch(
          `https://api.telegram.org/bot${token}/sendMessage`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              chat_id: chatId,
              text,
              disable_web_page_preview: true,
            }),
          }
        )
        if (!resp.ok) {
          const body = await resp.text().catch(() => "")
          throw new Error(`Telegram ${resp.status}: ${body.slice(0, 200)}`)
        }
      })
    )
  } catch (err) {
    try {
      container
        .resolve(ContainerRegistrationKeys.LOGGER)
        .warn(`notifyAdmin failed: ${(err as Error).message}`)
    } catch {
      /* logger unavailable */
    }
  }
}
