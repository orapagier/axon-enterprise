/**
 * Phase G — nightly dispute SLA sweep.
 *
 * For every pending refusal dispute, `classifyDisputeForSla` decides the next
 * step (the job runs nightly, so a dispute advances one step per tick):
 *
 *  - remind_buyer  → ~24h in with no buyer response: nudge them (email + push)
 *                    once, stamping buyer_reminder_sent_at.
 *  - escalate      → past the 48h SLA and still unresolved: stamp escalated_at
 *                    so the admin queue surfaces it. NO strike is applied — the
 *                    founder call is that a human always makes the verdict.
 *  - auto_resolve  → only when DISPUTE_NO_RESPONSE_AUTO_RESOLVE is flipped on:
 *                    a silent buyer past the SLA is auto-resolved as buyer_fault
 *                    ("silence = forfeit"). Implemented + tested, off by default.
 *
 * Run on-demand with:
 *   npx medusa exec ./src/jobs/dispute-sla-tick.ts
 */
import type { MedusaContainer } from "@medusajs/framework/types"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"
import { runJob, type JobInput } from "../lib/job-observability"
import {
  ACCOUNTABILITY_MODULE,
  DISPUTE_NO_RESPONSE_AUTO_RESOLVE,
} from "../modules/accountability"
import type AccountabilityModuleService from "../modules/accountability/service"
import { classifyDisputeForSla } from "../lib/dispute-sla"
import resolveDisputeWorkflow from "../workflows/resolve-dispute"
import { sendEmail } from "../lib/notify"
import { sendPush } from "../lib/push"
import { notifyAdmin } from "../lib/notify-admin"

export const config = {
  name: "dispute-sla-tick",
  // After clean-order-tick (02:00) so strike state settled before review.
  schedule: "15 2 * * *",
}

async function disputeSlaTick(container: MedusaContainer) {
  const logger = container.resolve(ContainerRegistrationKeys.LOGGER)
  const accountability: AccountabilityModuleService = container.resolve(
    ACCOUNTABILITY_MODULE
  )
  const query = container.resolve(ContainerRegistrationKeys.QUERY)

  const now = new Date()
  const pending = await accountability.listRefusalDisputes(
    { resolution: "pending" },
    { take: 500 }
  )
  if (!pending.length) {
    logger.info("dispute-sla-tick: no pending disputes.")
    return
  }

  // Resolve order email/display_id in one pass for any dispute we may notify.
  const orderIds = Array.from(new Set(pending.map((d) => d.order_id)))
  const { data: orderRows } = await query.graph({
    entity: "order",
    fields: ["id", "display_id", "email"],
    filters: { id: orderIds },
  })
  const orderById = new Map(
    (
      orderRows as unknown as Array<{
        id: string
        display_id: number
        email: string | null
      }>
    ).map((o) => [o.id, o])
  )

  let reminded = 0
  let escalated = 0
  let autoResolved = 0
  const escalatedOrders: number[] = []

  for (const d of pending) {
    const action = classifyDisputeForSla(d, now, {
      autoResolve: DISPUTE_NO_RESPONSE_AUTO_RESOLVE,
    })
    const order = orderById.get(d.order_id)

    if (action === "remind_buyer") {
      await accountability.updateRefusalDisputes({
        id: d.id,
        buyer_reminder_sent_at: now,
      })
      if (order) {
        await sendEmail(container, {
          to: order.email,
          template: "dispute-reminder",
          data: { display_id: order.display_id },
        })
      }
      await sendPush(container, {
        customerId: d.customer_id,
        title: "Action needed on your order",
        body: `Respond to the delivery issue on order #${
          order?.display_id ?? ""
        } before it's reviewed.`,
        url: "/account/disputes",
        tag: `dispute-${d.id}`,
      })
      reminded++
      continue
    }

    if (action === "escalate") {
      await accountability.updateRefusalDisputes({ id: d.id, escalated_at: now })
      escalated++
      if (order) escalatedOrders.push(order.display_id)
      logger.info(`Dispute ${d.id} past SLA → flagged for admin review.`)
      continue
    }

    if (action === "auto_resolve_buyer_fault") {
      try {
        await resolveDisputeWorkflow(container).run({
          input: {
            dispute_id: d.id,
            resolution: "buyer_fault",
            resolution_notes:
              "Auto-resolved: no buyer response within the 48-hour SLA.",
            resolved_by: null,
          },
        })
        await accountability.updateRefusalDisputes({
          id: d.id,
          auto_resolved: true,
        })
        if (order) {
          await sendEmail(container, {
            to: order.email,
            template: "dispute-resolved",
            data: { display_id: order.display_id, resolution: "buyer_fault" },
          })
        }
        autoResolved++
        logger.info(`Dispute ${d.id} auto-resolved buyer_fault (no response).`)
      } catch (err) {
        logger.warn(
          `dispute-sla-tick: auto-resolve of ${d.id} failed: ${
            (err as Error).message
          }`
        )
      }
    }
  }

  logger.info(
    `dispute-sla-tick finished: ${reminded} reminded, ${escalated} escalated, ${autoResolved} auto-resolved.`
  )
}

export default (input: JobInput) =>
  runJob("dispute-sla-tick", input, disputeSlaTick)
