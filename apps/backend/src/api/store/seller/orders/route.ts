import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { Modules } from "@medusajs/framework/utils"
import { hasRole } from "../../../../lib/roles"
import {
  scanConfirmRows,
  loadOrderForConfirm,
  producerItemLines,
  buyerName,
} from "../../../../lib/producer-confirm-store"

/** Resolve the authenticated producer, or null (response already sent). */
async function assertProducer(req: MedusaRequest, res: MedusaResponse) {
  const customerId = (req as unknown as { auth_context?: { actor_id?: string } })
    .auth_context?.actor_id
  if (!customerId) {
    res.status(401).json({ error: "Not authenticated" })
    return null
  }
  const customerModule = req.scope.resolve(Modules.CUSTOMER)
  const customer = await customerModule
    .retrieveCustomer(customerId, { select: ["id", "metadata"] })
    .catch(() => null)
  if (!customer) {
    res.status(401).json({ error: "Customer not found" })
    return null
  }
  if (!hasRole((customer.metadata ?? {}) as Record<string, unknown>, "producer")) {
    res.status(403).json({ error: "Producer account required" })
    return null
  }
  return customer
}

/**
 * GET /store/seller/orders — the producer's incoming direct orders + their
 * confirmation state (awaiting / escalated / confirmed / cancelled …), newest
 * first. The storefront uses this to render the Confirm/Decline run list with a
 * deadline countdown.
 */
export async function GET(req: MedusaRequest, res: MedusaResponse) {
  const customer = await assertProducer(req, res)
  if (!customer) return

  const rows = await scanConfirmRows(req.scope, { sellerId: customer.id })

  const orders = await Promise.all(
    rows.map(async (row) => {
      const full = await loadOrderForConfirm(req.scope, row.order_id)
      const items = full ? await producerItemLines(req.scope, full, customer.id) : ""
      return {
        order_id: row.order_id,
        display_id: row.display_id,
        created_at: row.created_at,
        status: row.entry.status,
        tier: row.entry.tier,
        deadline_at: row.entry.deadline_at,
        admin_deadline_at: row.entry.admin_deadline_at ?? null,
        late: row.entry.late ?? false,
        strike_recorded: row.entry.strike_recorded ?? false,
        items,
        buyer_name: full ? buyerName(full.shipping_address) || null : null,
        buyer_phone: full?.shipping_address?.phone ?? null,
      }
    })
  )

  res.json({ orders })
}
