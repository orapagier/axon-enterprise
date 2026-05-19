import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { Modules } from "@medusajs/framework/utils"

/**
 * GET /admin/memberships?status=pending|active|cancelled
 *
 * Lists customers by membership status. Admin uses the "pending" filter to
 * find users awaiting payment verification — pair with POST /admin/memberships/:id
 * to approve / reject.
 */
const MEMBERSHIP_META = {
  status: "membership_status",
  tier: "membership_tier",
  joinedAt: "membership_joined_at",
  expiresAt: "membership_expires_at",
  requestedAt: "membership_requested_at",
  paymentMethod: "membership_payment_method",
  paymentReference: "membership_payment_reference",
} as const

const VALID_STATUSES = new Set(["pending", "active", "cancelled"])

export async function GET(req: MedusaRequest, res: MedusaResponse) {
  const customerModule = req.scope.resolve(Modules.CUSTOMER)
  const rawStatus = (req.query.status as string | undefined)?.toLowerCase()
  const status = rawStatus && VALID_STATUSES.has(rawStatus) ? rawStatus : "pending"

  // No first-class metadata filter — fetch a generous page and filter in
  // memory. For a much larger user base this should move to a dedicated
  // link table or a database view.
  const customers = await customerModule.listCustomers(
    {},
    {
      take: 1000,
      select: [
        "id",
        "email",
        "first_name",
        "last_name",
        "company_name",
        "phone",
        "metadata",
        "created_at",
      ],
    }
  )

  const matching = customers.filter(
    (c) =>
      (c.metadata as Record<string, unknown> | null)?.[
        MEMBERSHIP_META.status
      ] === status
  )

  const memberships = matching.map((c) => {
    const meta = (c.metadata as Record<string, unknown> | null) ?? {}
    return {
      customer: {
        id: c.id,
        email: c.email,
        first_name: c.first_name,
        last_name: c.last_name,
        company_name: c.company_name,
        phone: c.phone,
        created_at: c.created_at,
      },
      membership: {
        status: meta[MEMBERSHIP_META.status] ?? null,
        tier: meta[MEMBERSHIP_META.tier] ?? null,
        joinedAt: meta[MEMBERSHIP_META.joinedAt] ?? null,
        expiresAt: meta[MEMBERSHIP_META.expiresAt] ?? null,
        requestedAt: meta[MEMBERSHIP_META.requestedAt] ?? null,
        paymentMethod: meta[MEMBERSHIP_META.paymentMethod] ?? null,
        paymentReference: meta[MEMBERSHIP_META.paymentReference] ?? null,
      },
    }
  })

  res.json({ status, count: memberships.length, memberships })
}
