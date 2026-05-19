import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { Modules } from "@medusajs/framework/utils"

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
} as const

const DAY_MS = 24 * 60 * 60 * 1000
const DEFAULT_DURATION_DAYS = 365
const DEFAULT_TIER = "harvest-01"
const HUB_MEMBER_GROUP = "hub-members"

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
    select: ["id", "metadata"],
  })
  if (!customer) {
    res.status(404).json({ error: "Customer not found" })
    return
  }

  const existing = (customer.metadata as Record<string, unknown> | null) ?? {}
  const now = Date.now()

  let updatedMetadata: Record<string, unknown>

  if (body.action === "approve") {
    const durationDays =
      typeof body.durationDays === "number" && body.durationDays > 0
        ? Math.floor(body.durationDays)
        : DEFAULT_DURATION_DAYS
    const tier =
      typeof body.tier === "string" && body.tier.trim().length > 0
        ? body.tier.trim()
        : DEFAULT_TIER

    updatedMetadata = {
      ...existing,
      [MEMBERSHIP_META.status]: "active",
      [MEMBERSHIP_META.tier]: tier,
      [MEMBERSHIP_META.joinedAt]: now,
      [MEMBERSHIP_META.expiresAt]: now + durationDays * DAY_MS,
      [MEMBERSHIP_META.points]:
        typeof existing[MEMBERSHIP_META.points] === "number"
          ? existing[MEMBERSHIP_META.points]
          : 0,
      // Payment ref has been honoured; clear so the storefront stops showing
      // the "pending" state.
      [MEMBERSHIP_META.requestedAt]: null,
      [MEMBERSHIP_META.paymentMethod]: null,
      [MEMBERSHIP_META.paymentReference]: null,
    }
  } else if (body.action === "reject") {
    updatedMetadata = {
      ...existing,
      [MEMBERSHIP_META.status]: "cancelled",
      [MEMBERSHIP_META.requestedAt]: null,
      [MEMBERSHIP_META.paymentMethod]: null,
      [MEMBERSHIP_META.paymentReference]: null,
    }
  } else {
    // cancel
    updatedMetadata = {
      ...existing,
      [MEMBERSHIP_META.status]: "cancelled",
      [MEMBERSHIP_META.expiresAt]: now,
    }
  }

  await customerModule.updateCustomers(customerId, {
    metadata: updatedMetadata,
  })

  // Best-effort group sync. Member-pricing rules are usually scoped to the
  // `hub-members` group; mirroring metadata into the group keeps Medusa's
  // price-list machinery in step. Failures here don't block the approval —
  // metadata is the source of truth the storefront reads.
  if (body.action === "approve") {
    try {
      const groups = await customerModule.listCustomerGroups(
        { name: HUB_MEMBER_GROUP },
        { take: 1 }
      )
      const group = groups?.[0]
      if (group?.id) {
        await customerModule.createCustomerGroupCustomers([
          { customer_id: customerId, customer_group_id: group.id },
        ])
      }
    } catch {
      /* group missing or already-assigned — ignore */
    }
  } else {
    try {
      const groups = await customerModule.listCustomerGroups(
        { name: HUB_MEMBER_GROUP },
        { take: 1 }
      )
      const group = groups?.[0]
      if (group?.id) {
        // The customer module's group-remove API varies across Medusa
        // versions; best-effort.
        const linkApi = customerModule as unknown as {
          removeCustomerFromGroup?: (
            customerId: string,
            groupId: string
          ) => Promise<unknown>
        }
        await linkApi.removeCustomerFromGroup?.(customerId, group.id)
      }
    } catch {
      /* ignore */
    }
  }

  res.json({
    ok: true,
    action: body.action,
    membership: {
      status: updatedMetadata[MEMBERSHIP_META.status],
      tier: updatedMetadata[MEMBERSHIP_META.tier] ?? null,
      joinedAt: updatedMetadata[MEMBERSHIP_META.joinedAt] ?? null,
      expiresAt: updatedMetadata[MEMBERSHIP_META.expiresAt] ?? null,
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
    },
  })
}
