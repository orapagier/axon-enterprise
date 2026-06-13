import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"
import {
  ACCOUNTABILITY_MODULE,
  DISPUTE_RESPONSE_SLA_MS,
} from "../../../modules/accountability"
import type AccountabilityModuleService from "../../../modules/accountability/service"

const toMs = (v: unknown): number | null => {
  if (v == null) return null
  const d = typeof v === "string" ? new Date(v) : (v as Date)
  const ms = d.getTime()
  return Number.isFinite(ms) ? ms : null
}

/**
 * GET /admin/disputes
 * Query:
 *   resolution (default 'pending')
 *   appeal=requested   → list disputes awaiting an appeal decision instead
 *
 * Each row carries an `overdue` flag (pending past the response SLA) so the
 * queue can surface disputes that need a human verdict.
 */
export async function GET(req: MedusaRequest, res: MedusaResponse) {
  const accountability: AccountabilityModuleService = req.scope.resolve(
    ACCOUNTABILITY_MODULE
  )
  const query = req.scope.resolve(ContainerRegistrationKeys.QUERY)

  const appeal = req.query.appeal as string | undefined
  const filters =
    appeal === "requested"
      ? { appeal_state: "requested" }
      : { resolution: (req.query.resolution as string) ?? "pending" }

  const rawDisputes = await accountability.listRefusalDisputes(filters, {
    order: { created_at: "DESC" },
    take: 200,
  })

  const now = Date.now()
  const disputes = rawDisputes.map((d) => {
    const createdMs = toMs(d.created_at)
    return {
      ...d,
      overdue:
        d.resolution === "pending" &&
        createdMs != null &&
        now - createdMs >= DISPUTE_RESPONSE_SLA_MS,
    }
  })

  const ids = Array.from(new Set(disputes.map((d) => d.customer_id)))
  let customerById = new Map<
    string,
    { id: string; email: string | null; first_name: string | null; last_name: string | null }
  >()
  if (ids.length > 0) {
    const { data } = await query.graph({
      entity: "customer",
      fields: ["id", "email", "first_name", "last_name"],
      filters: { id: ids },
    })
    customerById = new Map(
      (data as Array<{ id: string; email: string | null; first_name: string | null; last_name: string | null }>).map(
        (c) => [c.id, c]
      )
    )
  }

  const enriched = disputes.map((d) => ({
    ...d,
    customer: customerById.get(d.customer_id) ?? null,
  }))

  res.json({ disputes: enriched, count: enriched.length })
}
