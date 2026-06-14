/**
 * Nightly membership / yearly-registration lifecycle (Phases B + C, extended
 * for the stackable-roles model).
 *
 * The Producer and Trader roles ride on a yearly registration fee tracked by
 * the membership_* metadata keys (pay at hub → admin approves). Lifecycle for
 * every customer:
 *
 *   status=active:
 *     - ≤30 days left → "membership-expiring" email, once
 *       (membership_reminder_30_sent); same at ≤7 days.
 *     - past membership_expires_at → status=grace with a 30-day window
 *       (membership_grace_until), "membership-grace" email. Perks stay on
 *       during grace — the member keeps 30 days to pay at the hub counter.
 *   status=grace:
 *     - past membership_grace_until → DOWNGRADE: status=cancelled, the
 *       Producer/Trader role is stripped back to the Consumer base,
 *       producer listings are deleted, trader discount group/approval is
 *       removed, hub-members group membership is removed,
 *       "membership-expired" email. Re-upgrading later is the normal
 *       conversion flow (Account types page) + paying at the hub again.
 *
 * Reminder flags are re-armed on the next approval (admin memberships route).
 *
 * Run on-demand with:
 *   npx medusa exec ./src/jobs/membership-expiry-tick.ts
 */
import type { MedusaContainer } from "@medusajs/framework/types"
import { ContainerRegistrationKeys, Modules } from "@medusajs/framework/utils"
import { deleteProductsWorkflow } from "@medusajs/medusa/core-flows"
import { sendEmail } from "../lib/notify"
import { notifyAdmin } from "../lib/notify-admin"
import { rolesOf } from "../lib/roles"
import { syncTraderGroupMembership } from "../lib/trader"
import { LISTING_MODULE } from "../modules/listing"
import type ListingModuleService from "../modules/listing/service"
import { runJob, type JobInput } from "../lib/job-observability"

export const config = {
  name: "membership-expiry-tick",
  schedule: "30 2 * * *",
}

const DAY_MS = 24 * 60 * 60 * 1000
const GRACE_DAYS = 30
const HUB_MEMBER_GROUP = "hub-members"

export type MembershipTransition =
  | { kind: "grace"; grace_until: number }
  | { kind: "downgrade" }
  | { kind: "remind"; window: 30 | 7; days_left: number }
  | { kind: "none" }

/** Pure decision rule — exported for unit tests. */
export function resolveMembershipTransition(
  meta: Record<string, unknown>,
  nowMs: number
): MembershipTransition {
  const expiresAt = Number(meta.membership_expires_at)

  if (meta.membership_status === "grace") {
    // Pre-grace-window records may lack the explicit deadline — derive it.
    const stored = Number(meta.membership_grace_until)
    const graceUntil =
      Number.isFinite(stored) && stored > 0
        ? stored
        : Number.isFinite(expiresAt) && expiresAt > 0
          ? expiresAt + GRACE_DAYS * DAY_MS
          : 0
    if (graceUntil > 0 && graceUntil <= nowMs) return { kind: "downgrade" }
    return { kind: "none" }
  }

  if (meta.membership_status !== "active") return { kind: "none" }
  if (!Number.isFinite(expiresAt) || expiresAt <= 0) return { kind: "none" }

  if (expiresAt <= nowMs) {
    return { kind: "grace", grace_until: expiresAt + GRACE_DAYS * DAY_MS }
  }

  const daysLeft = Math.ceil((expiresAt - nowMs) / DAY_MS)
  if (daysLeft <= 7 && !meta.membership_reminder_7_sent) {
    return { kind: "remind", window: 7, days_left: daysLeft }
  }
  if (daysLeft <= 30 && !meta.membership_reminder_30_sent) {
    return { kind: "remind", window: 30, days_left: daysLeft }
  }
  return { kind: "none" }
}

/**
 * Delete every product the producer listed (founder call: downgrade deletes
 * listings — re-registering starts a fresh catalog). Products carry their
 * seller in metadata.seller_customer_id, so this pages through the catalog
 * the same way GET /store/seller/products does.
 */
async function deleteProducerListings(
  container: MedusaContainer,
  customerId: string
): Promise<number> {
  const query = container.resolve(ContainerRegistrationKeys.QUERY)

  const PAGE_SIZE = 200
  const MAX_PAGES = 50
  const productIds: string[] = []
  const listingIds: string[] = []

  for (let page = 0; page < MAX_PAGES; page++) {
    const { data } = await query.graph({
      entity: "product",
      fields: ["id", "metadata", "product_listing.id"],
      pagination: { take: PAGE_SIZE, skip: page * PAGE_SIZE },
    })
    const batch = (data ?? []) as {
      id: string
      metadata?: Record<string, unknown> | null
      product_listing?: { id?: string } | { id?: string }[] | null
    }[]
    for (const p of batch) {
      if (p.metadata?.seller_customer_id !== customerId) continue
      productIds.push(p.id)
      const raw = p.product_listing
      const listing = Array.isArray(raw) ? raw[0] : raw
      if (listing?.id) listingIds.push(listing.id)
    }
    if (batch.length < PAGE_SIZE) break
  }

  if (listingIds.length) {
    const listingService: ListingModuleService =
      container.resolve(LISTING_MODULE)
    await listingService.deleteProductListings(listingIds).catch(() => {})
  }
  if (productIds.length) {
    await deleteProductsWorkflow(container).run({
      input: { ids: productIds },
    })
  }
  return productIds.length
}

async function membershipExpiryTick(container: MedusaContainer) {
  const logger = container.resolve(ContainerRegistrationKeys.LOGGER)
  const customerModule = container.resolve(Modules.CUSTOMER)

  // Same in-memory metadata scan as the admin memberships list — fine at the
  // current user count; move to a link table/view when the base grows.
  const customers = await customerModule.listCustomers(
    {},
    { take: 1000, select: ["id", "email", "metadata"] }
  )

  const now = Date.now()
  let graced = 0
  let downgraded = 0
  let reminded = 0
  const downgradedLines: string[] = []

  for (const customer of customers) {
    const meta = (customer.metadata as Record<string, unknown> | null) ?? {}
    const transition = resolveMembershipTransition(meta, now)
    if (transition.kind === "none") continue

    const events = Array.isArray(meta.membership_events)
      ? (meta.membership_events as unknown[])
      : []

    if (transition.kind === "grace") {
      await customerModule.updateCustomers(customer.id, {
        metadata: {
          ...meta,
          membership_status: "grace",
          membership_grace_until: transition.grace_until,
          membership_events: [
            {
              ts: now,
              action: "grace",
              actor_id: "system:membership-expiry-tick",
              prev_status: "active",
            },
            ...events,
          ].slice(0, 20),
        },
      })

      await sendEmail(container, {
        to: customer.email,
        template: "membership-grace",
        data: { grace_until_ms: transition.grace_until },
      })
      graced++
      logger.info(
        `Membership lapsed for customer ${customer.id} — 30-day grace started.`
      )
      continue
    }

    if (transition.kind === "downgrade") {
      const roles = rolesOf(meta)
      const removedRoles = roles.filter(
        (r) => r === "producer" || r === "trader"
      )
      const keptRoles = roles.filter(
        (r) => r !== "producer" && r !== "trader"
      )

      await customerModule.updateCustomers(customer.id, {
        metadata: {
          ...meta,
          membership_status: "cancelled",
          membership_grace_until: null,
          roles: keptRoles,
          ...(removedRoles.includes("trader")
            ? {
                trader_approved: false,
                trader_discount_percent: null,
                trader_min_order_note: null,
              }
            : {}),
          membership_events: [
            {
              ts: now,
              action: "downgrade",
              actor_id: "system:membership-expiry-tick",
              prev_status: "grace",
              removed_roles: removedRoles,
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

      if (removedRoles.includes("trader")) {
        // Out of the traders-<pct> group → the automatic discount stops.
        await syncTraderGroupMembership(container, customer.id, null).catch(
          () => {}
        )
      }

      if (removedRoles.includes("producer")) {
        try {
          const deleted = await deleteProducerListings(container, customer.id)
          if (deleted > 0) {
            logger.info(
              `Deleted ${deleted} listing(s) for downgraded producer ${customer.id}.`
            )
          }
        } catch (err) {
          logger.error(
            `Listing cleanup failed for downgraded producer ${customer.id}: ${err}`
          )
        }
      }

      await sendEmail(container, {
        to: customer.email,
        template: "membership-expired",
        data: { removed_roles: removedRoles },
      })
      downgraded++
      logger.info(
        `Membership grace ended for customer ${customer.id} — downgraded to consumer (removed: ${removedRoles.join(", ") || "none"}).`
      )
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
    `membership-expiry-tick: ${graced} grace started, ${downgraded} downgraded, ${reminded} reminder(s) sent.`
  )
}

export default (input: JobInput) =>
  runJob("membership-expiry-tick", input, membershipExpiryTick)
