import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { Modules } from "@medusajs/framework/utils"
import { sendEmail } from "../../../../lib/notify"

/**
 * POST /admin/memberships/:id
 *
 * Body: { action: "approve" | "reject" | "cancel", tier?: string, durationDays?: number }
 *
 * Flips the membership state on a customer's metadata. The storefront-side
 * helpers in lib/util/membership.ts read these metadata keys directly, so a
 * successful POST takes effect on the customer's next page load.
 *
 *   approve  — sets status=active, joinedAt=now, expiresAt=now+durationDays
 *              (default 365), tier=<tier or "harvest-01">. Clears the payment
 *              request fields since they've now been honoured.
 *   reject   — payment couldn't be verified. Resets the customer to free tier
 *              ("cancelled") and clears the payment fields so they can try
 *              again from the storefront.
 *   cancel   — admin-initiated cancellation of an active membership (e.g.
 *              refund). Same end state as reject but without clearing the
 *              payment ref (kept for audit).
 *
 * Best-effort: when approving, we also try to add the customer to the
 * `hub-members` customer group if it exists. Member-pricing rules in Medusa
 * are scoped to that group. If the group doesn't exist yet, the approval
 * still succeeds and metadata is the source of truth for the storefront UI.
 */

type Action = "approve" | "reject" | "cancel"

const MEMBERSHIP_META = {
  status: "membership_status",
  tier: "membership_tier",
  joinedAt: "membership_joined_at",
  expiresAt: "membership_expires_at",
  points: "membership_points",
  requestedAt: "membership_requested_at",
  paymentMethod: "membership_payment_method",
  paymentReference: "membership_payment_reference",
  events: "membership_events",
} as const

const DAY_MS = 24 * 60 * 60 * 1000
const DEFAULT_DURATION_DAYS = 365
const DEFAULT_TIER = "harvest-01"
const HUB_MEMBER_GROUP = "hub-members"
const MAX_EVENTS = 20

/** One row of the audit trail kept on customer.metadata.membership_events. */
type MembershipEvent = {
  ts: number
  action: Action
  actor_id: string | null
  prev_status: string | null
  tier?: string | null
  duration_days?: number | null
}

const appendEvent = (
  existing: Record<string, unknown>,
  event: MembershipEvent
): MembershipEvent[] => {
  const prior = Array.isArray(existing[MEMBERSHIP_META.events])
    ? (existing[MEMBERSHIP_META.events] as MembershipEvent[])
    : []
  // Newest first; keep only the last N so customer metadata doesn't bloat
  // unboundedly over the years.
  return [event, ...prior].slice(0, MAX_EVENTS)
}

export async function POST(req: MedusaRequest, res: MedusaResponse) {
  const customerId = req.params.id
  const body = (req.body ?? {}) as {
    action?: Action
    tier?: string
    durationDays?: number
  }

  if (!body.action || !["approve", "reject", "cancel"].includes(body.action)) {
    res.status(400).json({
      error: "Body must include action: approve | reject | cancel",
    })
    return
  }

  const customerModule = req.scope.resolve(Modules.CUSTOMER)
  const customer = await customerModule.retrieveCustomer(customerId, {
    select: ["id", "email", "metadata"],
  })
  if (!customer) {
    res.status(404).json({ error: "Customer not found" })
    return
  }

  const existing = (customer.metadata as Record<string, unknown> | null) ?? {}
  const now = Date.now()
  const prevStatus =
    typeof existing[MEMBERSHIP_META.status] === "string"
      ? (existing[MEMBERSHIP_META.status] as string)
      : null

  // A renewal request is a payment submitted by a member whose term is still
  // valid (status stayed active/grace). Rejecting one must not revoke that
  // still-valid term — it just drops the pending renewal.
  const isRenewalRequest = existing.membership_renewal_pending === true

  // The admin's user id (whoever is signed into the dashboard). Audit-trail
  // attribution. The Medusa framework populates this on authenticated admin
  // requests; we cast since the type isn't exported as a stable surface.
  const actorId =
    (req as unknown as { auth_context?: { actor_id?: string } }).auth_context
      ?.actor_id ?? null

  let updatedMetadata: Record<string, unknown>
  const event: MembershipEvent = {
    ts: now,
    action: body.action,
    actor_id: actorId,
    prev_status: prevStatus,
  }

  if (body.action === "approve") {
    const durationDays =
      typeof body.durationDays === "number" && body.durationDays > 0
        ? Math.floor(body.durationDays)
        : DEFAULT_DURATION_DAYS
    const tier =
      typeof body.tier === "string" && body.tier.trim().length > 0
        ? body.tier.trim()
        : DEFAULT_TIER
    event.tier = tier
    event.duration_days = durationDays

    // Renewals extend from the later of now / current expiry so a member who
    // renews early never loses remaining days; a first-time (or lapsed)
    // approval starts the clock from now. Same code path serves both — a
    // renewal is just an approve where the customer is still active.
    const existingExpiry =
      typeof existing[MEMBERSHIP_META.expiresAt] === "number"
        ? (existing[MEMBERSHIP_META.expiresAt] as number)
        : 0
    const expiryBase = Math.max(now, existingExpiry)

    updatedMetadata = {
      ...existing,
      [MEMBERSHIP_META.status]: "active",
      [MEMBERSHIP_META.tier]: tier,
      // Preserve the original join date across renewals.
      [MEMBERSHIP_META.joinedAt]:
        typeof existing[MEMBERSHIP_META.joinedAt] === "number"
          ? existing[MEMBERSHIP_META.joinedAt]
          : now,
      [MEMBERSHIP_META.expiresAt]: expiryBase + durationDays * DAY_MS,
      [MEMBERSHIP_META.points]:
        typeof existing[MEMBERSHIP_META.points] === "number"
          ? existing[MEMBERSHIP_META.points]
          : 0,
      // Payment ref has been honoured; clear so the storefront stops showing
      // the "pending"/"renewal submitted" state.
      [MEMBERSHIP_META.requestedAt]: null,
      [MEMBERSHIP_META.paymentMethod]: null,
      [MEMBERSHIP_META.paymentReference]: null,
      // Fresh membership term — re-arm the expiry reminder emails (Phase B),
      // clear any 30-day grace window, and clear a pending renewal request.
      membership_reminder_30_sent: null,
      membership_reminder_7_sent: null,
      membership_grace_until: null,
      membership_renewal_pending: null,
      [MEMBERSHIP_META.events]: appendEvent(existing, event),
    }
  } else if (body.action === "reject") {
    // Rejecting a renewal payment drops only the pending request — the
    // member's current term stays intact. Rejecting a first-time request
    // resets the customer to the free tier.
    updatedMetadata = {
      ...existing,
      ...(isRenewalRequest ? {} : { [MEMBERSHIP_META.status]: "cancelled" }),
      [MEMBERSHIP_META.requestedAt]: null,
      [MEMBERSHIP_META.paymentMethod]: null,
      [MEMBERSHIP_META.paymentReference]: null,
      membership_renewal_pending: null,
      [MEMBERSHIP_META.events]: appendEvent(existing, event),
    }
  } else {
    // cancel — admin-initiated cancellation of an active membership.
    updatedMetadata = {
      ...existing,
      [MEMBERSHIP_META.status]: "cancelled",
      [MEMBERSHIP_META.expiresAt]: now,
      membership_renewal_pending: null,
      [MEMBERSHIP_META.events]: appendEvent(existing, event),
    }
  }

  await customerModule.updateCustomers(customerId, {
    metadata: updatedMetadata,
  })

  // Group sync. Member-pricing rules are usually scoped to the `hub-members`
  // customer group; mirroring metadata into the group keeps Medusa's
  // price-list machinery in step. We lazily create the group on the first
  // approval so a separate migration step isn't required. Failures here
  // don't block the approval — metadata is the source of truth the
  // storefront reads.
  try {
    let group = (
      await customerModule.listCustomerGroups(
        { name: HUB_MEMBER_GROUP },
        { take: 1 }
      )
    )?.[0]

    // Create on first approval; never auto-create on reject/cancel — no
    // point conjuring an empty group just to remove someone from it.
    if (!group && body.action === "approve") {
      group = await customerModule.createCustomerGroups({
        name: HUB_MEMBER_GROUP,
        metadata: {
          source: "hub-members-auto-created",
          purpose:
            "Members of Mindanao Fresh Hub. Member-pricing price lists are scoped to this group.",
        },
      })
    }

    if (group?.id) {
      const pair = { customer_id: customerId, customer_group_id: group.id }
      // Key off the resulting status, not the verb: a rejected *renewal*
      // leaves the member active, so they must stay in the group.
      if (updatedMetadata[MEMBERSHIP_META.status] === "active") {
        await customerModule.addCustomerToGroup(pair)
      } else {
        await customerModule.removeCustomerFromGroup(pair)
      }
    }
  } catch {
    /* group lookup/create/assign/remove failed — ignore, metadata wins */
  }

  // Phase B — membership status email (best-effort, never blocks the action).
  // A rejected renewal leaves the member active, so we don't email a
  // misleading "rejected" notice — only when the term is actually cancelled.
  if (!(body.action === "reject" && isRenewalRequest)) {
    await sendEmail(req.scope, {
      to: customer.email,
      template:
        body.action === "approve"
          ? "membership-approved"
          : body.action === "reject"
            ? "membership-rejected"
            : "membership-cancelled",
      data:
        body.action === "approve"
          ? {
              tier: updatedMetadata[MEMBERSHIP_META.tier],
              expires_at_ms: updatedMetadata[MEMBERSHIP_META.expiresAt],
            }
          : {},
    })
  }

  res.json({
    ok: true,
    action: body.action,
    membership: {
      status: updatedMetadata[MEMBERSHIP_META.status],
      tier: updatedMetadata[MEMBERSHIP_META.tier] ?? null,
      joinedAt: updatedMetadata[MEMBERSHIP_META.joinedAt] ?? null,
      expiresAt: updatedMetadata[MEMBERSHIP_META.expiresAt] ?? null,
      events: updatedMetadata[MEMBERSHIP_META.events] ?? [],
    },
  })
}

/**
 * GET /admin/memberships/:id — read current membership state for a customer.
 * Handy for admin dashboards and for confirming an approval went through.
 */
export async function GET(req: MedusaRequest, res: MedusaResponse) {
  const customerId = req.params.id
  const customerModule = req.scope.resolve(Modules.CUSTOMER)
  const customer = await customerModule.retrieveCustomer(customerId, {
    select: ["id", "email", "metadata"],
  })
  if (!customer) {
    res.status(404).json({ error: "Customer not found" })
    return
  }
  const meta = (customer.metadata as Record<string, unknown> | null) ?? {}
  res.json({
    customer: { id: customer.id, email: customer.email },
    membership: {
      status: meta[MEMBERSHIP_META.status] ?? null,
      tier: meta[MEMBERSHIP_META.tier] ?? null,
      joinedAt: meta[MEMBERSHIP_META.joinedAt] ?? null,
      expiresAt: meta[MEMBERSHIP_META.expiresAt] ?? null,
      requestedAt: meta[MEMBERSHIP_META.requestedAt] ?? null,
      paymentMethod: meta[MEMBERSHIP_META.paymentMethod] ?? null,
      paymentReference: meta[MEMBERSHIP_META.paymentReference] ?? null,
      events: meta[MEMBERSHIP_META.events] ?? [],
    },
  })
}
