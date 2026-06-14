import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { Modules } from "@medusajs/framework/utils"
import { notifyAdmin } from "../../../../../lib/notify-admin"

/**
 * POST /store/customers/me/membership-payment
 *
 * Fired by the storefront immediately after a customer submits a membership
 * payment (first-time activation or a renewal) for manual verification. The
 * payment itself is recorded by the storefront writing the customer's
 * membership_* metadata; this route's only job is to ping the admin Telegram so
 * the founder knows a payment is waiting in the /app/memberships pending queue.
 *
 * It reads the (already-written) metadata rather than trusting the body, so the
 * message can't be spoofed and there's nothing to validate. Best-effort: a
 * Telegram failure never surfaces to the buyer.
 */
export async function POST(req: MedusaRequest, res: MedusaResponse) {
  const customerId = (req as unknown as { auth_context?: { actor_id?: string } })
    .auth_context?.actor_id
  if (!customerId) {
    res.status(401).json({ error: "Not authenticated" })
    return
  }

  const customers = req.scope.resolve(Modules.CUSTOMER)
  const customer = await customers.retrieveCustomer(customerId)
  const meta = (customer?.metadata as Record<string, unknown> | null) ?? {}

  const isRenewal = meta.membership_renewal_pending === true
  const method = (meta.membership_payment_method as string | null) ?? "—"
  const reference = (meta.membership_payment_reference as string | null) ?? null

  await notifyAdmin(req.scope, {
    title: isRenewal
      ? "💳 Membership renewal — verify payment"
      : "💳 Membership payment — verify",
    lines: [
      customer?.email && `Account: ${customer.email}`,
      `Method: ${method.toUpperCase()}`,
      reference ? `Reference: ${reference}` : "Reference: (walk-in cash)",
    ],
    url: "/app/memberships",
  })

  res.json({ ok: true })
}
