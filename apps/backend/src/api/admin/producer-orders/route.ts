import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"
import {
  scanConfirmRows,
  loadOrderForConfirm,
  producerItemLines,
  buyerName,
} from "../../../lib/producer-confirm-store"

/**
 * GET /admin/producer-orders — the escalation queue: direct orders whose
 * producer missed the confirmation window and now await an admin Take (fulfil
 * from hub stock) or Cancel decision, with the admin-window countdown.
 */
export async function GET(req: MedusaRequest, res: MedusaResponse) {
  const query = req.scope.resolve(ContainerRegistrationKeys.QUERY)

  const rows = await scanConfirmRows(req.scope, { statuses: ["escalated"] })

  // Batch-resolve producer emails for display.
  const sellerIds = [...new Set(rows.map((r) => r.seller_id))]
  const emailById = new Map<string, string | null>()
  if (sellerIds.length) {
    const { data: customers } = await query.graph({
      entity: "customer",
      fields: ["id", "email", "company_name", "metadata"],
      filters: { id: sellerIds },
    })
    for (const c of customers as {
      id: string
      email: string | null
      company_name: string | null
      metadata: Record<string, unknown> | null
    }[]) {
      const name =
        (typeof c.metadata?.business_name === "string" && c.metadata.business_name) ||
        c.company_name ||
        c.email
      emailById.set(c.id, name ?? c.email)
    }
  }

  const escalations = await Promise.all(
    rows.map(async (row) => {
      const full = await loadOrderForConfirm(req.scope, row.order_id)
      const items = full ? await producerItemLines(req.scope, full, row.seller_id) : ""
      return {
        order_id: row.order_id,
        display_id: row.display_id,
        seller_id: row.seller_id,
        producer: emailById.get(row.seller_id) ?? row.seller_id,
        tier: row.entry.tier,
        escalated_at: row.entry.escalated_at ?? null,
        admin_deadline_at: row.entry.admin_deadline_at ?? null,
        items,
        buyer_name: full ? buyerName(full.shipping_address) || null : null,
        buyer_phone: full?.shipping_address?.phone ?? null,
      }
    })
  )

  res.json({ escalations })
}
