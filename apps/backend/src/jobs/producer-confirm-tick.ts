/**
 * Producer order-confirmation tick (every 10 minutes).
 *
 * Drives the per-producer confirmation clock opened at order.placed (see
 * notify-seller-order). For each live entry on a recent order, the pure state
 * machine (`classifyConfirmEntry`) decides one step per tick:
 *
 *   - nudge       → re-ping the producer (push) every ~10 min while awaiting.
 *   - escalate    → past the confirm deadline: hand it to the hub/admin
 *                   (Telegram + admin email) and open the 1-hour admin window.
 *   - auto_cancel → admin window lapsed with no Take/Cancel: cancel the order
 *                   (safety net so it never sits idle), strike the producer,
 *                   and notify the buyer.
 *
 * Producers grabbing the order during the admin window, and admin Take/Cancel,
 * are handled by the store/admin routes — not here.
 *
 * Run on-demand:  npx medusa exec ./src/jobs/producer-confirm-tick.ts
 */
import type { MedusaContainer } from "@medusajs/framework/types"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"
import { runJob, type JobInput } from "../lib/job-observability"
import { notifyCustomer } from "../lib/notify-customer"
import { sendEmail } from "../lib/notify"
import { notifyAdmin } from "../lib/notify-admin"
import {
  classifyConfirmEntry,
  markNudged,
  markEscalated,
  applyCancel,
  isLive,
} from "../lib/producer-confirm"
import {
  readConfirmMap,
  persistConfirmEntry,
  recordProducerStrike,
  cancelMedusaOrderForProducer,
  notifyResolution,
  loadOrderForConfirm,
  producerItemLines,
} from "../lib/producer-confirm-store"

export const config = {
  name: "producer-confirm-tick",
  // Every 10 minutes — the confirm deadlines are sub-hourly, unlike the other
  // (nightly) jobs. Cheap: scans only orders from the last few hours.
  schedule: "*/10 * * * *",
}

// Cover the confirm window (≤1h) + admin window (1h) + a buffer.
const SCAN_WINDOW_MS = 4 * 60 * 60_000

async function producerConfirmTick(container: MedusaContainer) {
  const logger = container.resolve(ContainerRegistrationKeys.LOGGER)
  const query = container.resolve(ContainerRegistrationKeys.QUERY)

  const now = Date.now()
  const since = new Date(now - SCAN_WINDOW_MS)

  const { data: orders } = await query.graph({
    entity: "order",
    fields: ["id", "display_id", "email", "metadata", "created_at"],
    filters: { created_at: { $gte: since } },
    pagination: { take: 500, order: { created_at: "DESC" } },
  })

  let nudged = 0
  let escalated = 0
  let cancelled = 0

  for (const o of orders as unknown as Array<{
    id: string
    display_id: number
    email: string | null
    metadata: Record<string, unknown> | null
  }>) {
    const map = readConfirmMap(o.metadata)
    const sellerIds = Object.keys(map)
    if (!sellerIds.length) continue

    for (const sellerId of sellerIds) {
      const entry = map[sellerId]
      if (!entry || !isLive(entry.status)) continue

      const action = classifyConfirmEntry(entry, now)
      if (action === "none") continue

      if (action === "nudge") {
        await persistConfirmEntry(container, o.id, sellerId, markNudged(entry, now))
        await notifyCustomer(container, {
          customerId: sellerId,
          type: "order",
          title: "⏳ Order still needs confirmation",
          body: `Order #${o.display_id} is waiting — confirm it before the window closes.`,
          url: "/account/producer/orders",
          tag: `producer-confirm-${o.id}`,
        })
        nudged++
        continue
      }

      if (action === "escalate") {
        await persistConfirmEntry(
          container,
          o.id,
          sellerId,
          markEscalated(entry, now)
        )
        // Resolve this producer's item lines for the admin notice.
        const full = await loadOrderForConfirm(container, o.id)
        const itemsLine = full
          ? await producerItemLines(container, full, sellerId)
          : ""

        await notifyAdmin(container, {
          title: `⏰ Order #${o.display_id}: producer hasn't confirmed`,
          lines: [
            itemsLine && `Items: ${itemsLine}`,
            "Take it to the hub or cancel within 1 hour.",
          ],
          url: "/app/producer-orders",
        })
        await sendEmail(container, {
          to: process.env.ADMIN_NOTIFY_EMAIL,
          template: "admin-producer-escalation",
          data: { display_id: o.display_id, items: itemsLine || null },
        })
        escalated++
        continue
      }

      if (action === "auto_cancel") {
        const { entry: next, strike } = applyCancel(entry, now)
        await persistConfirmEntry(container, o.id, sellerId, next)
        if (strike) {
          await recordProducerStrike(container, sellerId, {
            order_id: o.id,
            display_id: o.display_id,
            reason: "No confirmation within the window; admin did not take the order.",
            tier: entry.tier,
          })
        }
        const full = await loadOrderForConfirm(container, o.id)
        if (full) {
          const r = await cancelMedusaOrderForProducer(
            container,
            full,
            sellerId,
            "producer no-confirm + admin window lapsed"
          )
          await notifyResolution(container, full, sellerId, "cancelled", r.mode)
        }
        cancelled++
        continue
      }
    }
  }

  logger.info(
    `producer-confirm-tick: ${nudged} nudged, ${escalated} escalated, ${cancelled} auto-cancelled.`
  )
}

export default (input: JobInput) =>
  runJob("producer-confirm-tick", input, producerConfirmTick)
