/**
 * Nightly membership lifecycle (Phases B + C).
 *
 * For every customer with membership_status=active:
 *   - past membership_expires_at  → status=cancelled, removed from the
 *     `hub-members` group, "membership-expired" email. (Until now the expiry
 *     date was stored but never enforced — members kept perks forever.)
 *   - ≤7 days left   → "membership-expiring" email, once
 *     (membership_reminder_7_sent).
 *   - ≤30 days left  → "membership-expiring" email, once
 *     (membership_reminder_30_sent).
 * Reminder flags are re-armed on the next approval (admin memberships route).
 *
 * Run on-demand with:
 *   npx medusa exec ./src/jobs/membership-expiry-tick.ts
 */
import type { MedusaContainer } from "@medusajs/framework/types"
import { ContainerRegistrationKeys, Modules } from "@medusajs/framework/utils"
import { sendEmail } from "../lib/notify"

export const config = {
  name: "membership-expiry-tick",
  schedule: "30 2 * * *",
}

const DAY_MS = 24 * 60 * 60 * 1000
const HUB_MEMBER_GROUP = "hub-members"

export type MembershipTransition =
  | { kind: "expire" }
  | { kind: "remind"; window: 30 | 7; days_left: number }
  | { kind: "none" }

/** Pure decision rule — exported for unit tests. */
export function resolveMembershipTransition(
  meta: Record<string, unknown>,
  nowMs: number
): MembershipTransition {
  if (meta.membership_status !== "active") return { kind: "none" }
  const expiresAt = Number(meta.membership_expires_at)
  if (!Number.isFinite(expiresAt) || expiresAt <= 0) return { kind: "none" }

  if (expiresAt <= nowMs) return { kind: "expire" }

  const daysLeft = Math.ceil((expiresAt - nowMs) / DAY_MS)
  if (daysLeft <= 7 && !meta.membership_reminder_7_sent) {
    return { kind: "remind", window: 7, days_left: daysLeft }
  }
  if (daysLeft <= 30 && !meta.membership_reminder_30_sent) {
    return { kind: "remind", window: 30, days_left: daysLeft }
  }
  return { kind: "none" }
}

export default async function membershipExpiryTick(
  input: MedusaContainer | { container: MedusaContainer }
) {
  // The scheduler invokes jobs with the bare container; `npx medusa exec`
  // passes an ExecArgs object instead. Accept both.
  const container =
    "container" in input
      ? (input as { container: MedusaContainer }).container
      : input

  const logger = container.resolve(ContainerRegistrationKeys.LOGGER)
  const customerModule = container.resolve(Modules.CUSTOMER)

  // Same in-memory metadata scan as the admin memberships list — fine at the
  // current user count; move to a link table/view when the base grows.
  const customers = await customerModule.listCustomers(
    {},
    { take: 1000, select: ["id", "email", "metadata"] }
  )

  const now = Date.now()
  let expired = 0
  let reminded = 0

  for (const customer of customers) {
    const meta = (customer.metadata as Record<string, unknown> | null) ?? {}
    const transition = resolveMembershipTransition(meta, now)
    if (transition.kind === "none") continue

    if (transition.kind === "expire") {
      const events = Array.isArray(meta.membership_events)
        ? (meta.membership_events as unknown[])
        : []
      await customerModule.updateCustomers(customer.id, {
        metadata: {
          ...meta,
          membership_status: "cancelled",
          membership_events: [
            {
              ts: now,
              action: "cancel",
              actor_id: "system:membership-expiry-tick",
              prev_status: "active",
            },
            ...events,
          ].slice(0, 20),
        },
      })

      // Mirror into the hub-members group so member price lists stop applying.
      try {
        const [group] = await customerModule.listCustomerGroups(
          { name: HUB_MEMBER_GROUP },
          { take: 1 }
        )
        if (group?.id) {
          await customerModule.removeCustomerFromGroup({
            customer_id: customer.id,
            customer_group_id: group.id,
          })
        }
      } catch {
        // metadata is the source of truth; group sync is best-effort
      }

      await sendEmail(container, {
        to: customer.email,
        template: "membership-expired",
        data: {},
      })
      expired++
      logger.info(`Membership expired for customer ${customer.id}.`)
      continue
    }

    // remind
    await customerModule.updateCustomers(customer.id, {
      metadata: {
        ...meta,
        [`membership_reminder_${transition.window}_sent`]: now,
      },
    })
    await sendEmail(container, {
      to: customer.email,
      template: "membership-expiring",
      data: {
        days_left: transition.days_left,
        expires_at_ms: Number(meta.membership_expires_at),
      },
    })
    reminded++
    logger.info(
      `Membership expiring in ${transition.days_left}d for customer ${customer.id} — reminder sent (${transition.window}d window).`
    )
  }

  logger.info(
    `membership-expiry-tick finished: ${expired} expired, ${reminded} reminder(s) sent.`
  )
}
