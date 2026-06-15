import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { assertProducer } from "../../../../lib/seller-auth"
import {
  scanConfirmRows,
  loadOrderForConfirm,
  producerItemLines,
  buyerName,
} from "../../../../lib/producer-confirm-store"

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
